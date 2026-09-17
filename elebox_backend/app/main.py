from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.alarms import router as alarms_router
from app.api.auth import router as auth_router
from app.api.battery_health import router as battery_health_router
from app.api.imports import router as imports_router
from app.api.locations import router as locations_router
from app.api.monitoring import router as monitoring_router
from app.api.notifications import router as notifications_router
from app.api.roles import router as roles_router
from app.api.sboxes import router as sboxes_router
from app.api.users import router as users_router
from app.api.websocket import router as websocket_router
from app.api.work_areas import router as work_areas_router
from app.core.config import (
    ALLOWED_CREDENTIALS,
    ALLOWED_HEADERS,
    ALLOWED_METHODS,
    ALLOWED_ORIGINS,
)
from app.tasks.telemetry_poller import telemetry_poller
from app.utils.logger import get_logger
from app.websocket.connection_manager import telemetry_ws_manager
import app.models

logger = get_logger("main")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await telemetry_poller.start()
    logger.info("Application startup complete")
    yield
    await telemetry_poller.stop()
    logger.info("Application shutdown complete")


app = FastAPI(
    title="ELEBOX Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOWED_CREDENTIALS,
    allow_methods=ALLOWED_METHODS,
    allow_headers=ALLOWED_HEADERS,
)


@app.get("/")
def root():
    """
    Root endpoint.
    """
    return {
        "message": "ELEBOX Backend Running"
    }


@app.get("/health")
def health_check():
    """
    Health check endpoint.
    """
    return {
        "status": "UP",
        "last_poll_at": telemetry_poller.last_poll_at,
        "last_event_at": telemetry_poller.last_event_at,
        "websocket_clients": telemetry_ws_manager.client_count,
        "active_device_pollers": len(getattr(telemetry_poller, "_pollers", {})),
    }


# Register Routers
app.include_router(auth_router)
app.include_router(locations_router)
app.include_router(roles_router)
app.include_router(users_router)
app.include_router(work_areas_router)
app.include_router(sboxes_router)
app.include_router(monitoring_router)
app.include_router(notifications_router)
app.include_router(alarms_router)
app.include_router(battery_health_router)
app.include_router(imports_router)
app.include_router(websocket_router)
