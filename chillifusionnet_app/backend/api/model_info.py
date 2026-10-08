from fastapi import APIRouter
from ..services.report_service import report_service

router = APIRouter(prefix="/api/model-info", tags=["Model"])

@router.get("")
def get_model_info():
    """Returns model architecture and details."""
    return report_service.get_model_info()
