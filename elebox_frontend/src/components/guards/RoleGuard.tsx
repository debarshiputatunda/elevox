import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Permission } from '@/constants/roles';
import { ROUTES } from '@/constants/routes';
import { usePermission } from '@/hooks/usePermission';
import type { UserRole } from '@/types';

interface RoleGuardProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  roles?: UserRole[];
}

export const RoleGuard = ({
  children,
  permission,
  permissions = [],
  roles,
}: RoleGuardProps) => {
  const { user, canAny, roles: effectiveRoles } = usePermission();

  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;

  if (roles && !effectiveRoles.some((role) => roles.includes(role))) {
    return <Navigate to={ROUTES.FORBIDDEN} replace />;
  }

  const requiredPermissions = permission ? [permission, ...permissions] : permissions;
  if (requiredPermissions.length && !canAny(requiredPermissions)) {
    return <Navigate to={ROUTES.FORBIDDEN} replace />;
  }

  return <>{children}</>;
};
