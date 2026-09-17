import { hasAnyPermission, hasPermission, type Permission } from '@/constants/roles';
import { useAppSelector } from '@/hooks/redux';
import type { UserRole } from '@/types';

const getEffectiveRoles = (
  role: UserRole | undefined,
  roles: UserRole[] | undefined,
): UserRole[] => {
  if (roles?.length) {
    return roles;
  }
  return role ? [role] : [];
};

export const usePermission = () => {
  const user = useAppSelector((state) => state.auth.user);
  const effectiveRoles = getEffectiveRoles(user?.role, user?.roles);

  const can = (permission: Permission): boolean => {
    if (!effectiveRoles.length) {
      return false;
    }

    if (user?.permissions?.includes(permission)) {
      return true;
    }

    return effectiveRoles.some((role) => hasPermission(role, permission));
  };

  const canAny = (permissions: Permission[]): boolean => {
    if (!effectiveRoles.length) {
      return false;
    }

    if (user?.permissions?.some((permission) => permissions.includes(permission as Permission))) {
      return true;
    }

    return effectiveRoles.some((role) => hasAnyPermission(role, permissions));
  };

  const hasRole = (role: UserRole): boolean => effectiveRoles.includes(role);

  return {
    user,
    roles: effectiveRoles,
    can,
    canAny,
    hasRole,
    isAdmin: hasRole('Admin'),
    isManager: hasRole('Manager'),
    isEmployee: hasRole('Employee'),
  };
};
