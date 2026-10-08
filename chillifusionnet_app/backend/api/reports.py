from fastapi import APIRouter, Body
from typing import Dict, Any
from ..services.report_service import report_service

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("")
def get_reports():
    """Returns deep evaluation metrics and graph locations."""
    return report_service.get_reports_data()

@router.get("/saved")
def get_saved_reports():
    """Returns list of saved diagnosis reports (both single and batch)."""
    return report_service.get_saved_reports()

@router.get("/saved/{report_id}")
def get_saved_report(report_id: str):
    """Returns details of a specific saved diagnosis report."""
    return report_service.get_saved_report(report_id)

@router.post("/save")
def save_report(report: Dict[str, Any] = Body(...)):
    """Saves a single or batch diagnosis report to history."""
    return report_service.save_diagnosis_report(report)
