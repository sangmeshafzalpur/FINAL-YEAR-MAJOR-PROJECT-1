import sys
import io
from pathlib import Path
from PIL import Image

# Ensure the backend module is accessible
sys.path.append(str(Path(__file__).resolve().parent))

from backend.services.prediction_service import PredictionService

def generate_dummy_image() -> bytes:
    """Creates a simple colored image for testing if no real image exists."""
    img = Image.new('RGB', (380, 380), color = (73, 109, 137))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    return img_byte_arr.getvalue()

def run_test():
    print("Testing PredictionService...")
    try:
        # Load a dummy image
        img_bytes = generate_dummy_image()
        
        # Test the prediction service
        result = PredictionService.predict(img_bytes)
        print("Prediction Successful!")
        print(f"Predicted Class: {result['predicted_class']}")
        print(f"Confidence: {result['confidence']:.4f}")
        print("All Probabilities:")
        for cls, prob in result['all_probabilities'].items():
            print(f"  {cls}: {prob:.4f}")
            
    except Exception as e:
        print(f"Test failed with error: {e}")

if __name__ == "__main__":
    run_test()
