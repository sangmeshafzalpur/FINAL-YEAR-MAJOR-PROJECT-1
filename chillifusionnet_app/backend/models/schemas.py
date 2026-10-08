from pydantic import BaseModel
from typing import List, Dict, Optional

class ClassProbability(BaseModel):
    class_name: str
    display_name: str
    probability: float

class PredictionResponse(BaseModel):
    predicted_class: str
    display_name: str
    confidence: float
    category: str
    description: str
    recommendation: str
    all_probabilities: Dict[str, float]
    ranked_probabilities: List[ClassProbability]
    inference_time_ms: float
    timestamp: str
    heatmap_url: Optional[str] = None
    
class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_load_error: Optional[str]
    classes: Optional[List[str]]

class ModelInfoResponse(BaseModel):
    model_name: str
    architecture: str
    input_size: List[int]
    num_classes: Optional[int]
    class_names: Optional[List[str]]
