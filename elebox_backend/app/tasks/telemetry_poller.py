"""Backward-compatible export for the telemetry orchestrator."""

from app.telemetry.orchestrator import telemetry_orchestrator

telemetry_poller = telemetry_orchestrator

__all__ = ["telemetry_poller", "telemetry_orchestrator"]
