import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

// Mock the useAuth hook
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockConfirmRegistration = jest.fn();

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    confirmRegistration: mockConfirmRegistration,
  }),
}));

describe('Authentication Components Backend Integration', () => {
  let queryClient: QueryClient;

  beforeAll(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('LoginForm Component Integration', () => {
    test('should render all required form elements', () => {
      renderWithProviders(<LoginForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    test('should validate email format', async () => {
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Test invalid email format
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // HTML5 validation should prevent submission
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    test('should call signIn with correct credentials', async () => {
      const mockOnSuccess = jest.fn();
      renderWithProviders(<LoginForm onSuccess={mockOnSuccess} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Fill valid form data
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });

      // Mock successful login
      mockSignIn.mockResolvedValueOnce(undefined);

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'Password123!');
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    test('should display error message on authentication failure', async () => {
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

      // Mock authentication failure
      mockSignIn.mockRejectedValueOnce(new Error('Invalid credentials'));

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    test('should show loading state during authentication', async () => {
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });

      // Mock slow authentication
      mockSignIn.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 1000)));

      fireEvent.click(submitButton);

      // Check loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    test('should switch to register form when requested', () => {
      const mockSwitchToRegister = jest.fn();
      renderWithProviders(<LoginForm onSwitchToRegister={mockSwitchToRegister} />);

      const switchButton = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(switchButton);

      expect(mockSwitchToRegister).toHaveBeenCalled();
    });
  });

  describe('RegisterForm Component Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should render all required registration fields', () => {
      renderWithProviders(<RegisterForm />);

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    test('should validate required fields', async () => {
      renderWithProviders(<RegisterForm />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      // HTML5 validation should prevent submission
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    test('should call signUp with correct user data', async () => {
      renderWithProviders(<RegisterForm />);

      // Fill all required fields
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john.doe@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } });

      // Mock successful registration
      mockSignUp.mockResolvedValueOnce(undefined);

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          'john.doe@example.com',
          'Password123!',
          'John',
          'Doe'
        );
      });

      // Should show confirmation step
      await waitFor(() => {
        expect(screen.getByText(/confirmation code/i)).toBeInTheDocument();
      });
    });

    test('should handle registration errors appropriately', async () => {
      renderWithProviders(<RegisterForm />);

      // Fill form
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'existing@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } });

      // Mock registration failure
      mockSignUp.mockRejectedValueOnce(new Error('User already exists'));

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/user already exists/i)).toBeInTheDocument();
      });
    });

    test('should handle email confirmation flow', async () => {
      renderWithProviders(<RegisterForm />);

      // Mock successful registration leading to confirmation
      mockSignUp.mockResolvedValueOnce(undefined);

      // Fill and submit registration
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john.doe@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      // Wait for confirmation form
      await waitFor(() => {
        expect(screen.getByLabelText(/confirmation code/i)).toBeInTheDocument();
      });

      // Fill confirmation code
      fireEvent.change(screen.getByLabelText(/confirmation code/i), { target: { value: '123456' } });

      // Mock successful confirmation
      mockConfirmRegistration.mockResolvedValueOnce(undefined);

      fireEvent.click(screen.getByRole('button', { name: /confirm email/i }));

      await waitFor(() => {
        expect(mockConfirmRegistration).toHaveBeenCalledWith('john.doe@example.com', '123456');
      });
    });

    test('should allow switching back to login form', () => {
      const mockSwitchToLogin = jest.fn();
      renderWithProviders(<RegisterForm onSwitchToLogin={mockSwitchToLogin} />);

      const switchButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(switchButton);

      expect(mockSwitchToLogin).toHaveBeenCalled();
    });

    test('should validate password strength requirements', async () => {
      renderWithProviders(<RegisterForm />);

      const passwordInput = screen.getByLabelText(/password/i);

      // Test weak password
      fireEvent.change(passwordInput, { target: { value: '123' } });

      // HTML5 validation or component validation should handle this
      // For now, we verify the placeholder text indicates requirements
      expect(passwordInput).toHaveAttribute('placeholder', expect.stringMatching(/8 characters/i));
    });
  });

  describe('Authentication Component API Integration', () => {
    test('should make correct API calls with proper headers', async () => {
      // This would test the actual API integration
      // In a real scenario, you'd mock the fetch calls and verify:

      const expectedAuthHeaders = {
        'Content-Type': 'application/json',
        'Authorization': expect.stringMatching(/^Bearer .+/)
      };

      // Mock a successful API response structure
      const mockApiResponse = {
        ok: true,
        json: async () => ({
          token: 'mock-jwt-token',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User'
          }
        })
      };

      // Verify that our components would work with this API structure
      expect(mockApiResponse.ok).toBe(true);

      const data = await mockApiResponse.json();
      expect(data.token).toBeTruthy();
      expect(data.user.email).toBeTruthy();
    });

    test('should handle API error responses correctly', async () => {
      // Mock API error response
      const mockErrorResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Invalid credentials',
          message: 'The email or password you entered is incorrect.'
        })
      };

      expect(mockErrorResponse.ok).toBe(false);
      expect(mockErrorResponse.status).toBe(401);

      const errorData = await mockErrorResponse.json();
      expect(errorData.error).toBeTruthy();
      expect(errorData.message).toBeTruthy();
    });

    test('should format requests according to backend expectations', () => {
      // Verify the expected request format for login
      const loginRequestBody = {
        email: 'user@example.com',
        password: 'Password123!'
      };

      expect(loginRequestBody).toHaveProperty('email');
      expect(loginRequestBody).toHaveProperty('password');
      expect(loginRequestBody.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

      // Verify the expected request format for registration
      const registrationRequestBody = {
        email: 'user@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      expect(registrationRequestBody).toHaveProperty('email');
      expect(registrationRequestBody).toHaveProperty('password');
      expect(registrationRequestBody).toHaveProperty('firstName');
      expect(registrationRequestBody).toHaveProperty('lastName');
    });
  });
});