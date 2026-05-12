from fastapi import APIRouter

from app.modules.admin.router import router as admin_router
from app.modules.asset.router import router as asset_router
from app.modules.auth.router import router as auth_router
from app.modules.generation.router import router as generation_router
from app.modules.project_workflow.router import router as project_router
from app.modules.script.router import router as script_router
from app.modules.selling_point.router import router as selling_point_router
from app.modules.source_analysis.router import router as source_analysis_router


api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(project_router)
api_router.include_router(selling_point_router)
api_router.include_router(source_analysis_router)
api_router.include_router(script_router)
api_router.include_router(asset_router)
api_router.include_router(generation_router)
api_router.include_router(admin_router)
