import numpy as np
import logging

from .model_service import model_service
from .preprocessing_service import PreprocessingService

logger = logging.getLogger(__name__)

class PredictionService:
    @staticmethod
    def predict(file_bytes: bytes) -> dict:
        """
        Orchestrates preprocessing and model inference.
        Returns a clean dictionary with predicted class, confidence, and all probabilities.
        """
        if model_service is None:
            raise RuntimeError("Prediction service is unavailable due to model initialization failure.")
            
        try:
            # 1. Preprocess
            input_array = PreprocessingService.preprocess_image(file_bytes)
            
            # 2. Get dependencies
            model = model_service.get_model()
            class_names = model_service.get_class_names()
            
            # 3. Predict — direct model call avoids predict() overhead
            probabilities = model(input_array, training=False).numpy()[0]
            
            # 4. Process results
            predicted_index = int(np.argmax(probabilities))
            predicted_class = class_names[predicted_index]
            confidence = float(probabilities[predicted_index])
            
            all_probabilities = {
                class_names[i]: float(probabilities[i])
                for i in range(len(class_names))
            }
            
            return {
                "predicted_class": predicted_class,
                "confidence": confidence,
                "all_probabilities": all_probabilities
            }
            
        except ValueError as ve:
            # Preprocessing errors (like invalid image) bubble up as ValueError
            raise ve
        except RuntimeError as re:
            # Model service errors
            raise re
        except Exception as exc:
            # Catch-all for unexpected inference errors (e.g., OOM, TF errors)
            logger.error(f"Inference failed: {exc}")
            raise RuntimeError("An internal error occurred during prediction.")

    @staticmethod
    def get_disease_metadata(predicted_class: str) -> dict:
        """
        Returns rich agronomic metadata for a predicted disease class.
        """
        cls_lower = str(predicted_class).lower()
        if "cercospora" in cls_lower:
            return {
                "display_name": "Cercospora Leaf Spot",
                "category": "Fungal Infection",
                "status": "Disease Detected",
                "is_healthy": False,
                "observation": "Circular or irregular necrotic lesions with grayish centers and dark reddish margins, frequently surrounded by a chlorotic halo.",
                "recommendation": "Prune and destroy infected leaves, optimize spacing for airflow, and apply copper oxychloride or azoxystrobin fungicides."
            }
        elif "mites" in cls_lower or "trips" in cls_lower:
            return {
                "display_name": "Mites & Thrips Infestation",
                "category": "Pest Infestation",
                "status": "Disease Detected",
                "is_healthy": False,
                "observation": "Severe upward or downward curling, brittleness, silvery leaf undersides, and fine webbing indicating active pest infestation.",
                "recommendation": "Spray insecticidal soap, neem oil, or abamectin. Introduce predatory phytoseiid mites and manage greenhouse humidity."
            }
        elif "nutritional" in cls_lower:
            return {
                "display_name": "Nutritional Deficiency",
                "category": "Nutrient Deficiency",
                "status": "Disease Detected",
                "is_healthy": False,
                "observation": "Interveinal chlorosis, generalized yellowing, or edge necrosis reflecting macro/micronutrient deficit (e.g. N, Mg, Fe, K).",
                "recommendation": "Test soil and irrigation pH. Apply balanced N-P-K fertilizer and targeted foliar micronutrient sprays (chelated iron, zinc, magnesium)."
            }
        elif "powdery" in cls_lower:
            return {
                "display_name": "Powdery Mildew",
                "category": "Fungal Infection",
                "status": "Disease Detected",
                "is_healthy": False,
                "observation": "Talcum-like white fungal powdery coating on lower foliage and corresponding chlorotic yellow patches on upper leaf blades.",
                "recommendation": "Avoid sprinkler irrigation, enhance ventilation, and apply wettable sulfur, potassium bicarbonate, or systemic triazole fungicides."
            }
        else:
            return {
                "display_name": "Healthy",
                "category": "Optimal Foliage",
                "status": "Healthy",
                "is_healthy": True,
                "observation": "Vibrant leaf coloration, robust cellular turgor, and completely intact lamina free from pathogen lesions or pest feeding damage.",
                "recommendation": "Maintain standard irrigation schedules, nutrient management, and regular preventative crop inspection."
            }

    @staticmethod
    def predict_batch_tensors(tensors: list[np.ndarray]) -> list[dict]:
        """
        Predicts across a list of preprocessed image tensors (1, 380, 380, 3) in a single batch pass.
        """
        if not tensors:
            return []
            
        if model_service is None:
            raise RuntimeError("Prediction service is unavailable due to model initialization failure.")

        model = model_service.get_model()
        class_names = model_service.get_class_names()

        # Concatenate along batch dimension -> (N, 380, 380, 3)
        batch_input = np.concatenate(tensors, axis=0)
        # Direct model() call skips predict()'s per-call overhead (validation, batching logic)
        batch_predictions = model(batch_input, training=False).numpy()

        results = []
        for i in range(len(tensors)):
            probabilities = batch_predictions[i]
            predicted_index = int(np.argmax(probabilities))
            predicted_class = class_names[predicted_index]
            confidence = float(probabilities[predicted_index])

            all_probabilities = {
                class_names[j]: float(probabilities[j])
                for j in range(len(class_names))
            }

            results.append({
                "predicted_class": predicted_class,
                "confidence": confidence,
                "all_probabilities": all_probabilities
            })

        return results
