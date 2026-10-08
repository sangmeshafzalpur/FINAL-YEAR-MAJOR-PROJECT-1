from fastapi import APIRouter
from ..services.report_service import report_service

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("")
def get_dashboard():
    """Returns high-level dashboard metrics."""
    return report_service.get_dashboard_data()
