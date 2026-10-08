import json
import logging
import threading
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from pathlib import Path

from ..config.settings import settings

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Custom Layers (Must be identical to original for deserialization)
# ------------------------------------------------------------------
class ChannelAttention(layers.Layer):
    def __init__(self, ratio=8, **kwargs):
        super().__init__(**kwargs)
        self.ratio = ratio

    def build(self, input_shape):
        channels = int(input_shape[-1])
        self.shared_dense_1 = layers.Dense(channels // self.ratio, activation="relu",
                                            kernel_initializer="he_normal", use_bias=True)
        self.shared_dense_2 = layers.Dense(channels, use_bias=True)
        self.avg_pool = layers.GlobalAveragePooling2D()
        self.max_pool = layers.GlobalMaxPooling2D()
        super().build(input_shape)

    def call(self, x):
        avg_out = self.shared_dense_2(self.shared_dense_1(self.avg_pool(x)))
        max_out = self.shared_dense_2(self.shared_dense_1(self.max_pool(x)))
        out = tf.nn.sigmoid(avg_out + max_out)
        out = tf.reshape(out, (-1, 1, 1, out.shape[-1]))
        return x * out

    def get_config(self):
        config = super().get_config()
        config.update({"ratio": self.ratio})
        return config


class SpatialAttention(layers.Layer):
    def __init__(self, kernel_size=7, **kwargs):
        super().__init__(**kwargs)
        self.kernel_size = kernel_size

    def build(self, input_shape):
        self.conv = layers.Conv2D(1, self.kernel_size, padding="same",
                                   activation="sigmoid", use_bias=False)
        super().build(input_shape)

    def call(self, x):
        avg_out = tf.reduce_mean(x, axis=-1, keepdims=True)
        max_out = tf.reduce_max(x, axis=-1, keepdims=True)
        concat = tf.concat([avg_out, max_out], axis=-1)
        attention_map = self.conv(concat)
        return x * attention_map

    def get_config(self):
        config = super().get_config()
        config.update({"kernel_size": self.kernel_size})
        return config


class CBAM(layers.Layer):
    def __init__(self, ratio=8, kernel_size=7, **kwargs):
        super().__init__(**kwargs)
        self.channel_attention = ChannelAttention(ratio=ratio)
        self.spatial_attention = SpatialAttention(kernel_size=kernel_size)
        self.ratio = ratio
        self.kernel_size = kernel_size

    def call(self, x):
        x = self.channel_attention(x)
        x = self.spatial_attention(x)
        return x

    def get_config(self):
        config = super().get_config()
        config.update({"ratio": self.ratio, "kernel_size": self.kernel_size})
        return config


class ModelService:
    """
    Singleton service to load the Keras model and class names exactly once.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(ModelService, cls).__new__(cls)
                    cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self.model = None
        self.class_names = []
        self._load_artifacts()

    def _load_artifacts(self):
        try:
            if not settings.CLASS_NAMES_PATH.exists():
                raise FileNotFoundError(f"Class names file missing at {settings.CLASS_NAMES_PATH}")
                
            with open(settings.CLASS_NAMES_PATH, 'r') as f:
                self.class_names = json.load(f)
                
            if not settings.MODEL_PATH.exists():
                raise FileNotFoundError(f"Model file missing at {settings.MODEL_PATH}")

            self.model = keras.models.load_model(
                settings.MODEL_PATH,
                custom_objects={
                    "CBAM": CBAM,
                    "ChannelAttention": ChannelAttention,
                    "SpatialAttention": SpatialAttention,
                },
            )
            logger.info("Model and class names loaded successfully.")
        except FileNotFoundError as fnf_err:
            logger.error(f"Initialization error: {fnf_err}")
            raise RuntimeError(f"Initialization error: {fnf_err}")
        except Exception as exc:
            logger.error(f"Failed to load the model: {exc}")
            raise RuntimeError("An internal error occurred while loading the model.")

    def get_model(self):
        if self.model is None:
            raise RuntimeError("Model is currently unavailable.")
        return self.model

    def get_class_names(self):
        if not self.class_names:
            raise RuntimeError("Class names are currently unavailable.")
        return self.class_names

# Instantiate singleton
try:
    model_service = ModelService()
except Exception as e:
    logger.error(f"Could not initialize ModelService: {e}")
    model_service = None
