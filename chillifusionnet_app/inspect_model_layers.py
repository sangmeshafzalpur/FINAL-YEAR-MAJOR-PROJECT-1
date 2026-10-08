import os
import sys
import tensorflow as tf
from pathlib import Path

# Add backend to path to import models if needed
sys.path.append(str(Path(__file__).resolve().parent))

# Import custom objects if needed
from backend.services.model_service import model_service

def inspect_model():
    model = model_service.get_model()
    if not model:
        print("Failed to load model.")
        return

    print(f"Model Name: {model.name}")
    print("--- Layers ---")
    for i, layer in enumerate(model.layers):
        print(f"[{i}] {layer.name} ({layer.__class__.__name__})")
        
    print("\nLooking for last conv layer in backbone (if applicable):")
    # If the model has a backbone, inspect inside it
    for layer in model.layers:
        if isinstance(layer, tf.keras.Model) or layer.__class__.__name__ == 'Functional':
            print(f"Inspecting nested model: {layer.name}")
            for sub_layer in layer.layers[-10:]: # last 10 layers of backbone
                print(f"  - {sub_layer.name} ({sub_layer.__class__.__name__})")

if __name__ == "__main__":
    inspect_model()
