import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { LoginPage } from '@/pages/auth/LoginPage';
import { renderWithProviders } from './test-utils';

describe('LoginPage', () => {
  it('renders login form fields', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(document.getElementById('password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });
});
