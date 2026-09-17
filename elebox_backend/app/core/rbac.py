from __future__ import annotations

from typing import Iterable


class RoleName:
    ADMIN = "Admin"
    MANAGER = "Manager"
    EMPLOYEE = "Employee"

    ALL = (ADMIN, MANAGER, EMPLOYEE)

    PRIORITY = (ADMIN, MANAGER, EMPLOYEE)


class Permission:
    DASHBOARD = "dashboard"
    USERS_MANAGE = "users.manage"
    USERS_VIEW = "users.view"
    LOCATIONS_MANAGE = "locations.manage"
    LOCATIONS_VIEW = "locations.view"
    WORK_AREAS_MANAGE = "workAreas.manage"
    WORK_AREAS_VIEW = "workAreas.view"
    TICKETS_MANAGE = "tickets.manage"
    TICKETS_VIEW = "tickets.view"
    SBOXES_MANAGE = "sboxes.manage"
    SBOXES_VIEW = "sboxes.view"
    MONITORING = "monitoring"
    NOTIFICATIONS = "notifications"
    ALARMS = "alarms"
    BATTERY_HEALTH = "batteryHealth"
    REPORTS = "reports"
    SETTINGS = "settings"
    PROFILE = "profile"


ROLE_PERMISSIONS: dict[str, tuple[str, ...]] = {
    RoleName.ADMIN: (
        Permission.DASHBOARD,
        Permission.USERS_MANAGE,
        Permission.LOCATIONS_MANAGE,
        Permission.WORK_AREAS_MANAGE,
        Permission.TICKETS_MANAGE,
        Permission.SBOXES_MANAGE,
        Permission.SBOXES_VIEW,
        Permission.MONITORING,
        Permission.NOTIFICATIONS,
        Permission.ALARMS,
        Permission.BATTERY_HEALTH,
        Permission.REPORTS,
        Permission.SETTINGS,
        Permission.PROFILE,
    ),
    RoleName.MANAGER: (
        Permission.DASHBOARD,
        Permission.USERS_VIEW,
        Permission.LOCATIONS_VIEW,
        Permission.WORK_AREAS_VIEW,
        Permission.TICKETS_MANAGE,
        Permission.SBOXES_VIEW,
        Permission.MONITORING,
        Permission.NOTIFICATIONS,
        Permission.ALARMS,
        Permission.BATTERY_HEALTH,
        Permission.REPORTS,
        Permission.PROFILE,
    ),
    RoleName.EMPLOYEE: (
        Permission.DASHBOARD,
        Permission.SBOXES_VIEW,
        Permission.MONITORING,
        Permission.NOTIFICATIONS,
        Permission.TICKETS_VIEW,
        Permission.PROFILE,
    ),
}

ACTIVE_STATUS_NAME = "Active"
BLOCKED_STATUS_NAMES = frozenset({"Inactive", "Blocked"})


def resolve_primary_role(role_names: Iterable[str]) -> str | None:
    role_set = set(role_names)
    for role in RoleName.PRIORITY:
        if role in role_set:
            return role
    return None


def get_permissions_for_roles(role_names: Iterable[str]) -> list[str]:
    permissions: set[str] = set()
    for role_name in role_names:
        permissions.update(ROLE_PERMISSIONS.get(role_name, ()))
    return sorted(permissions)


def has_role(role_names: Iterable[str], *allowed_roles: str) -> bool:
    role_set = set(role_names)
    return any(role in role_set for role in allowed_roles)


def has_permission(role_names: Iterable[str], permission: str) -> bool:
    return permission in get_permissions_for_roles(role_names)


def has_any_permission(role_names: Iterable[str], *permissions: str) -> bool:
    user_permissions = set(get_permissions_for_roles(role_names))
    return any(permission in user_permissions for permission in permissions)
