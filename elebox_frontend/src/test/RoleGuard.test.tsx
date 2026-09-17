import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { RoleGuard } from '@/components/guards/RoleGuard';
import authReducer from '@/store/slices/authSlice';
import type { UserRole } from '@/types';

const renderWithRole = (role: UserRole, permission: 'alarms' | 'dashboard') => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          id: 1,
          employeeId: 'E1',
          fullName: 'Test',
          email: 't@test.com',
          mobileNumber: '1',
          role,
          roles: [role],
          roleId: role === 'Admin' ? 1 : role === 'Manager' ? 2 : 3,
          roleIds: [role === 'Admin' ? 1 : role === 'Manager' ? 2 : 3],
          jobTitleId: 3,
          workAreaId: 1,
          locationId: 1,
          statusId: 1,
          status: 'Active' as const,
        },
        isAuthenticated: true,
        loading: false,
        error: null,
        initialized: true,
      },
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RoleGuard permission={permission}>
                <div>Protected Content</div>
              </RoleGuard>
            }
          />
          <Route path="/403" element={<div>Forbidden</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

describe('RoleGuard', () => {
  it('allows admin to access alarms', () => {
    renderWithRole('Admin', 'alarms');
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('blocks employee from alarms', () => {
    renderWithRole('Employee', 'alarms');
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
  });
});
