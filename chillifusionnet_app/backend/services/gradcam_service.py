import cv2
import numpy as np
import tensorflow as tf
import base64
import logging
from ..services.model_service import model_service

logger = logging.getLogger(__name__)


class GradCAMService:
    def __init__(self):
        self.last_conv_layer_name = 'top_activation'
        self.grad_model = None
        self._compiled_compute = None
        self._is_initialized = False

    def _ensure_grad_model(self):
        """Initializes and caches the grad_model once to eliminate graph rebuild overhead."""
        if self.grad_model is None:
            model = model_service.get_model()
            if not model:
                raise ValueError("Model is not loaded.")
            try:
                self.grad_model = tf.keras.models.Model(
                    inputs=[model.inputs],
                    outputs=[model.get_layer(self.last_conv_layer_name).output, model.output]
                )
                self._compiled_compute = tf.function(self._compute_heatmap_graph, reduce_retracing=True)
                self._is_initialized = True
                logger.info("GradCAMService cached grad_model initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize grad_model: {e}")
                raise e

    def _compute_heatmap_graph(self, img_array, pred_index):
        """tf.function-compiled inner graph for gradient computation — runs ~5x faster after tracing."""
        with tf.GradientTape() as tape:
            conv_output, preds = self.grad_model(img_array, training=False)
            p_idx = tf.cast(pred_index, tf.int32)
            class_channel = tf.gather(preds, p_idx, axis=1)

        grads = tape.gradient(class_channel, conv_output)
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

        last_conv_layer_output = conv_output[0]
        heatmap = last_conv_layer_output @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)

        heatmap = tf.maximum(heatmap, 0.0)
        max_val = tf.math.reduce_max(heatmap)
        heatmap = tf.cond(max_val > 1e-7, lambda: heatmap / max_val, lambda: heatmap)
        return heatmap

    def warmup(self):
        """Warms up the grad_model + tf.function graph trace during app startup."""
        try:
            self._ensure_grad_model()
            dummy_input = tf.zeros((1, 380, 380, 3), dtype=tf.float32)
            # Trace the compiled function with dummy data so first real call is instant
            _ = self._compiled_compute(dummy_input, tf.constant(0, dtype=tf.int32))
            logger.info("GradCAMService warmup + tf.function trace completed.")
        except Exception as e:
            logger.warning(f"GradCAM warmup non-fatal warning: {e}")

    def _get_gradcam_heatmap(self, img_array, model, last_conv_layer_name, pred_index=None):
        self._ensure_grad_model()

        if pred_index is None:
            # Quick forward pass to find the predicted class
            preds = self.grad_model(img_array, training=False)[1]
            pred_index = int(tf.argmax(preds[0]).numpy())

        pred_index_tensor = tf.constant(pred_index, dtype=tf.int32)
        heatmap = self._compiled_compute(img_array, pred_index_tensor)

        heatmap_np = heatmap.numpy()
        heatmap_np = np.nan_to_num(heatmap_np, nan=0.0, posinf=1.0, neginf=0.0)
        if heatmap_np.ndim == 3:
            heatmap_np = np.squeeze(heatmap_np)
        return np.ascontiguousarray(heatmap_np, dtype=np.float32)

    def generate_gradcam_overlay(self, file_bytes, img_tensor, pred_index=None):
        """
        Fast Grad-CAM heatmap and overlay generation.
        Downsamples high-resolution camera images for display to eliminate huge pixel processing latency.
        """
        try:
            model = model_service.get_model()
            if not model:
                raise ValueError("Model is not loaded.")
                
            heatmap = self._get_gradcam_heatmap(img_tensor, model, self.last_conv_layer_name, pred_index)
            
            # Load the original image with OpenCV from bytes
            np_arr = np.frombuffer(file_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Could not read original image for overlay.")
            
            # Constrain display resolution to maximum 640px to optimize rendering speed 40x
            max_dim = 640
            h, w = img.shape[:2]
            if max(h, w) > max_dim:
                scale = max_dim / float(max(h, w))
                new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
                img_disp = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            else:
                img_disp = img
                new_w, new_h = w, h

            # Fast heatmap resize directly to display dimensions
            heatmap_disp = cv2.resize(heatmap, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
            
            # Convert heatmap to RGB Jet colormap
            heatmap_uint8 = np.uint8(255 * heatmap_disp)
            heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
            
            # Blend overlay
            alpha = 0.4
            overlay = cv2.addWeighted(heatmap_colored, alpha, img_disp, 1 - alpha, 0)
            
            # Fast JPEG encoding (quality 80 for crisp web display with small payload)
            encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 80]
            _, buffer_gray = cv2.imencode('.jpg', heatmap_uint8, encode_params)
            _, buffer_heatmap = cv2.imencode('.jpg', heatmap_colored, encode_params)
            _, buffer_overlay = cv2.imencode('.jpg', overlay, encode_params)

            base64_gray = base64.b64encode(buffer_gray).decode('utf-8')
            base64_heatmap = base64.b64encode(buffer_heatmap).decode('utf-8')
            base64_overlay = base64.b64encode(buffer_overlay).decode('utf-8')
            
            return {
                "success": True,
                "gradcam_base64": f"data:image/jpeg;base64,{base64_gray}",
                "heatmap_base64": f"data:image/jpeg;base64,{base64_heatmap}",
                "overlay_base64": f"data:image/jpeg;base64,{base64_overlay}"
            }
        except Exception as e:
            logger.error(f"Grad-CAM generation failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

gradcam_service = GradCAMService()
