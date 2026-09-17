import { render, type RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import type { ReactElement, ReactNode } from 'react';

const createTestStore = (preloadedState?: object) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState,
  });

interface WrapperProps {
  children: ReactNode;
  route?: string;
}

const AllProviders = ({ children, route = '/' }: WrapperProps) => {
  const store = createTestStore();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
};

export const renderWithProviders = (
  ui: ReactElement,
  options?: RenderOptions & { route?: string },
) => render(ui, { wrapper: (props) => <AllProviders {...props} route={options?.route} />, ...options });
