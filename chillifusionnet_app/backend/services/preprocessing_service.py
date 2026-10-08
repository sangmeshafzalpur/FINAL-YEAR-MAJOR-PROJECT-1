import io
import numpy as np
from PIL import Image, UnidentifiedImageError
from tensorflow.keras.applications.efficientnet import preprocess_input
import logging

from ..config.settings import settings

logger = logging.getLogger(__name__)

class PreprocessingService:
    @staticmethod
    def preprocess_image(file_bytes: bytes) -> np.ndarray:
        """
        Safely opens an image, resizes it to the expected dimensions, 
        and applies EfficientNet preprocessing.
        """
        try:
            # Handle corrupted or invalid images safely
            image = Image.open(io.BytesIO(file_bytes))
            image.verify()  # Verify it is an image
            
            # Reopen after verify
            image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            
            # Resize exactly to model specs (380x380 for EfficientNetB4)
            image = image.resize((settings.IMG_SIZE, settings.IMG_SIZE))
            
            array = np.array(image, dtype=np.float32)
            
            # Use original model's preprocessing to prevent accuracy drop
            array = preprocess_input(array)
            
            # Expand dimensions to match (batch_size, height, width, channels)
            return array[np.newaxis, ...]
            
        except UnidentifiedImageError:
            logger.error("Invalid image format or corrupted file uploaded.")
            raise ValueError("The provided file is not a valid image or is corrupted.")
        except Exception as exc:
            logger.error(f"Error during preprocessing: {exc}")
            raise ValueError("An error occurred while processing the image.")

    @classmethod
    def preprocess_image_bytes(cls, file_bytes: bytes) -> np.ndarray:
        """Alias for preprocess_image for compatibility."""
        return cls.preprocess_image(file_bytes)
