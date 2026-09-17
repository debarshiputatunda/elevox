import asyncio
from collections import defaultdict

import json
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from app.utils.logger import get_logger

logger = get_logger("websocket")


class TelemetryConnectionManager:
    """Device-channel WebSocket manager. Telemetry is delivered only to subscribed clients."""

    def __init__(self):
        self._connections: dict[WebSocket, tuple[set[int], set[int]]] = {}
        self._device_channels: dict[int, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()
        self._priority_listener = None

    def set_priority_listener(self, listener):
        self._priority_listener = listener

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self._connections[websocket] = (set(), set())
        logger.info("WebSocket connected | clients=%s", len(self._connections))

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            subscribed, _high = self._connections.pop(websocket, (set(), set()))
            for box_id in subscribed:
                channel = self._device_channels.get(box_id)
                if channel:
                    channel.discard(websocket)
                    if not channel:
                        self._device_channels.pop(box_id, None)
        if self._priority_listener:
            await self._priority_listener()
        logger.info("WebSocket disconnected | clients=%s", len(self._connections))

    async def subscribe(
        self,
        websocket: WebSocket,
        box_ids: set[int],
        high_priority_box_ids: set[int] | None = None,
    ) -> set[int]:
        high_priority_box_ids = high_priority_box_ids or set()
        async with self._lock:
            if websocket not in self._connections:
                return set()
            previous_boxes, _previous_high = self._connections[websocket]
            for box_id in previous_boxes - box_ids:
                channel = self._device_channels.get(box_id)
                if channel:
                    channel.discard(websocket)
                    if not channel:
                        self._device_channels.pop(box_id, None)
            for box_id in box_ids - previous_boxes:
                self._device_channels[box_id].add(websocket)
            self._connections[websocket] = (set(box_ids), set(high_priority_box_ids))
        if self._priority_listener:
            await self._priority_listener()
        return set(box_ids)

    def get_subscriber_counts(self) -> dict[int, dict[str, int]]:
        counts: dict[int, dict[str, int]] = {}
        for box_id, sockets in self._device_channels.items():
            counts[box_id] = {
                "subscriber_count": len(sockets),
                "high_priority_subscribers": 0,
            }
        return counts

    async def broadcast_to_device(
        self,
        event_type: str,
        payload: dict[str, Any],
        box_id: int,
    ):
        message = json.dumps({"type": event_type, "data": payload})
        async with self._lock:
            targets = list(self._device_channels.get(box_id, set()))

        if not targets:
            return

        stale: list[WebSocket] = []
        for websocket in targets:
            try:
                await websocket.send_text(message)
            except (WebSocketDisconnect, RuntimeError):
                stale.append(websocket)

        for websocket in stale:
            await self.disconnect(websocket)

    async def broadcast_to_all(self, event_type: str, payload: dict[str, Any]):
        message = json.dumps({"type": event_type, "data": payload})
        async with self._lock:
            targets = list(self._connections.keys())
        stale: list[WebSocket] = []
        for websocket in targets:
            try:
                await websocket.send_text(message)
            except (WebSocketDisconnect, RuntimeError):
                stale.append(websocket)
        for websocket in stale:
            await self.disconnect(websocket)

    async def send_heartbeat(self):
        message = json.dumps({"type": "heartbeat", "data": {"status": "ok"}})
        async with self._lock:
            targets = list(self._connections.keys())
        stale: list[WebSocket] = []
        for websocket in targets:
            try:
                await websocket.send_text(message)
            except (WebSocketDisconnect, RuntimeError):
                stale.append(websocket)
        for websocket in stale:
            await self.disconnect(websocket)

    @property
    def client_count(self) -> int:
        return len(self._connections)

    def subscriber_count(self, box_id: int) -> int:
        return len(self._device_channels.get(box_id, set()))

    def subscribed_box_ids(self) -> set[int]:
        return set(self._device_channels.keys())


telemetry_ws_manager = TelemetryConnectionManager()
