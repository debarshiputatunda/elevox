import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { PublicRoute } from '@/components/guards/PublicRoute';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { LocationsPage } from '@/pages/locations/LocationsPage';
import { WorkAreasPage } from '@/pages/workAreas/WorkAreasPage';
import { TicketsPage } from '@/pages/tickets/TicketsPage';
import { SBoxesPage } from '@/pages/sboxes/SBoxesPage';
import { SBoxDetailPage } from '@/pages/sboxes/SBoxDetailPage';
import { SBoxAssignmentPage } from '@/pages/sboxAssignment/SBoxAssignmentPage';
import { MonitoringPage } from '@/pages/monitoring/MonitoringPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { BatteryHealthPage } from '@/pages/batteryHealth/BatteryHealthPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { LocationImportPage } from '@/pages/imports/LocationImportPage';
import { WorkAreaImportPage } from '@/pages/imports/WorkAreaImportPage';
import { UserImportPage } from '@/pages/imports/UserImportPage';
import { SBoxImportPage } from '@/pages/imports/SBoxImportPage';
import { ForbiddenPage } from '@/pages/errors/ForbiddenPage';
import { NotFoundPage } from '@/pages/errors/NotFoundPage';
import { ROUTES } from '@/constants/routes';

export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    element: (
      <PublicRoute>
        <ForgotPasswordPage />
      </PublicRoute>
    ),
  },
  {
    path: ROUTES.FORBIDDEN,
    element: <ForbiddenPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <Navigate to={ROUTES.DASHBOARD} replace />,
          },
          {
            path: 'dashboard',
            element: (
              <RoleGuard permission="dashboard">
                <DashboardPage />
              </RoleGuard>
            ),
          },
          {
            path: 'users',
            element: (
              <RoleGuard permissions={['users.manage', 'users.view']}>
                <UsersPage />
              </RoleGuard>
            ),
          },
          {
            path: 'locations',
            element: (
              <RoleGuard permissions={['locations.manage', 'locations.view']}>
                <LocationsPage />
              </RoleGuard>
            ),
          },
          {
            path: 'work-areas',
            element: (
              <RoleGuard permissions={['workAreas.manage', 'workAreas.view']}>
                <WorkAreasPage />
              </RoleGuard>
            ),
          },
          {
            path: 'tickets',
            element: (
              <RoleGuard permission="tickets.manage">
                <TicketsPage />
              </RoleGuard>
            ),
          },
          {
            path: 'my-tickets',
            element: (
              <RoleGuard permission="tickets.view">
                <TicketsPage />
              </RoleGuard>
            ),
          },
          {
            path: 'sboxes',
            element: (
              <RoleGuard permissions={['sboxes.manage', 'sboxes.view']}>
                <SBoxesPage />
              </RoleGuard>
            ),
          },
          {
            path: 'sboxes/register',
            element: <Navigate to="/sboxes" replace />,
          },
          {
            path: 'sboxes/:id',
            element: (
              <RoleGuard permissions={['sboxes.manage', 'sboxes.view']}>
                <SBoxDetailPage />
              </RoleGuard>
            ),
          },
          {
            path: 'my-sboxes',
            element: (
              <RoleGuard permission="sboxes.view">
                <SBoxesPage />
              </RoleGuard>
            ),
          },
          {
            path: 'sbox-assignment',
            element: (
              <RoleGuard permission="sboxes.manage">
                <SBoxAssignmentPage />
              </RoleGuard>
            ),
          },
          {
            path: 'monitoring',
            element: (
              <RoleGuard permission="monitoring">
                <MonitoringPage />
              </RoleGuard>
            ),
          },
          {
            path: 'notifications',
            element: (
              <RoleGuard permission="notifications">
                <NotificationsPage />
              </RoleGuard>
            ),
          },
          {
            path: 'battery-health',
            element: (
              <RoleGuard permission="batteryHealth">
                <BatteryHealthPage />
              </RoleGuard>
            ),
          },
          {
            path: 'reports',
            element: (
              <RoleGuard permission="reports">
                <ReportsPage />
              </RoleGuard>
            ),
          },
          {
            path: 'settings',
            element: (
              <RoleGuard permission="settings">
                <SettingsPage />
              </RoleGuard>
            ),
          },
          {
            path: 'profile',
            element: (
              <RoleGuard permission="profile">
                <ProfilePage />
              </RoleGuard>
            ),
          },
          {
            path: 'imports/locations',
            element: (
              <RoleGuard permission="locations.manage">
                <LocationImportPage />
              </RoleGuard>
            ),
          },
          {
            path: 'imports/work-areas',
            element: (
              <RoleGuard permission="workAreas.manage">
                <WorkAreaImportPage />
              </RoleGuard>
            ),
          },
          {
            path: 'imports/users',
            element: (
              <RoleGuard permission="users.manage">
                <UserImportPage />
              </RoleGuard>
            ),
          },
          {
            path: 'imports/sboxes',
            element: (
              <RoleGuard permission="sboxes.manage">
                <SBoxImportPage />
              </RoleGuard>
            ),
          },
        ],
      },
    ],
  },
  {
    path: ROUTES.NOT_FOUND,
    element: <NotFoundPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
