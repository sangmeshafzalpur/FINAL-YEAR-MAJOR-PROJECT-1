# Constants for validation
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}

# Human-readable info per class
DISEASE_INFO = {
    "cercospora": {
        "display_name": "Cercospora Leaf Spot",
        "category": "disease",
        "description": "A fungal infection causing circular gray-to-brown lesions with darker margins, usually starting on older, lower leaves.",
        "recommendation": "Remove and destroy affected leaves, improve airflow between plants, and apply a suitable fungicide if spread continues.",
    },
    "healthy": {
        "display_name": "Healthy",
        "category": "healthy",
        "description": "No visible signs of disease, pest damage, or nutrient stress were detected on this leaf.",
        "recommendation": "Continue routine watering, fertilization, and monitoring — no action needed.",
    },
    "mites_and_trips": {
        "display_name": "Mites & Thrips Infestation",
        "category": "pest",
        "description": "Pest damage from mites or thrips, typically appearing as stippled, silvery, or curled leaf tissue.",
        "recommendation": "Introduce or preserve natural predators where possible, apply insecticidal soap or a targeted miticide, and inspect neighboring plants.",
    },
    "nutritional": {
        "display_name": "Nutritional Deficiency",
        "category": "deficiency",
        "description": "Discoloration or irregular growth patterns consistent with a nutrient imbalance, often nitrogen, magnesium, or potassium.",
        "recommendation": "Test soil composition and pH, then apply a balanced or deficiency-specific fertilizer.",
    },
    "powdery mildew": {
        "display_name": "Powdery Mildew",
        "category": "disease",
        "description": "A fungal disease presenting as a white-to-gray powdery coating on leaf surfaces, which can spread quickly in humid conditions.",
        "recommendation": "Improve air circulation, reduce leaf wetness, and apply a fungicide labeled for powdery mildew.",
    },
}
