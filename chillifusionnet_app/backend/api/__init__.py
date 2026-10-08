from .diagnosis import router as diagnosis_router
from .dashboard import router as dashboard_router
from .model_info import router as model_info_router
from .reports import router as reports_router

__all__ = ["diagnosis_router", "dashboard_router", "model_info_router", "reports_router"]
