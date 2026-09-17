import json

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.repositories.auth_repository import AuthRepository
from app.repositories.role_repository import RoleRepository
from app.core.rbac import Permission, has_any_permission
from app.telemetry.orchestrator import telemetry_orchestrator
from app.utils.jwt_handler import verify_access_token
from app.utils.logger import get_logger
from app.websocket.connection_manager import telemetry_ws_manager

router = APIRouter(tags=["WebSocket"])
logger = get_logger("websocket_api")


def _authenticate_ws(token: str | None) -> bool:
    if not token:
        return False

    payload = verify_access_token(token)
    if payload is None:
        return False

    user_id = payload.get("user_id")
    if user_id is None:
        return False

    db: Session = SessionLocal()
    try:
        user = AuthRepository.get_user_by_id(db=db, user_id=user_id)
        if user is None:
            return False
        roles = RoleRepository.get_user_roles(db=db, user_id=user_id)
        role_names = {role.role_name for role in roles}
        return has_any_permission(role_names, Permission.MONITORING)
    finally:
        db.close()


def _parse_box_ids(raw) -> set[int]:
    if raw is None:
        return set()
    if isinstance(raw, list):
        return {int(item) for item in raw if str(item).strip()}
    if isinstance(raw, (int, float)):
        return {int(raw)}
    text = str(raw).strip()
    if not text:
        return set()
    return {int(item.strip()) for item in text.split(",") if item.strip()}


@router.websocket("/ws/telemetry")
async def telemetry_websocket(
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    if not _authenticate_ws(token):
        await websocket.close(code=4401)
        return

    await telemetry_ws_manager.connect(websocket)

    try:
        while True:
            message = await websocket.receive_text()
            try:
                payload = json.loads(message)
            except json.JSONDecodeError:
                continue

            action = payload.get("action")
            if action == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "data": {"status": "ok"}}))
            elif action == "subscribe":
                box_ids = _parse_box_ids(payload.get("box_ids") or payload.get("device_id"))
                high_priority = _parse_box_ids(payload.get("high_priority_box_ids"))
                subscribed = await telemetry_ws_manager.subscribe(
                    websocket,
                    box_ids,
                    high_priority,
                )
                await websocket.send_text(json.dumps({
                    "type": "subscribed",
                    "data": {"box_ids": sorted(subscribed)},
                }))
            elif action == "set_priority":
                box_id = payload.get("box_id") or payload.get("device_id")
                if box_id is not None:
                    enabled = bool(payload.get("high", True))
                    telemetry_orchestrator.set_high_priority(int(box_id), enabled)
                    await websocket.send_text(json.dumps({
                        "type": "priority",
                        "data": {"box_id": int(box_id), "high": enabled},
                    }))
    except WebSocketDisconnect:
        await telemetry_ws_manager.disconnect(websocket)
    except Exception as exc:
        logger.warning("WebSocket session error: %s", exc)
        await telemetry_ws_manager.disconnect(websocket)
