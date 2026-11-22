import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { clearSession, getSession, hasActiveSession, setSession } from '@/services/session';

describe('LoginPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSession();
  });

  const renderLogin = (entry = '/login') =>
    render(
      <MemoryRouter initialEntries={[entry]}>
        <LoginPage />
      </MemoryRouter>
    );

  it('renders Option A (Demo) and Option B (Household) side-by-side with demo featured', () => {
    renderLogin();

    expect(screen.getByRole('heading', { level: 1, name: /Sign in to Homie SmartSpace/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Option A: Try the Demo/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Option B: Household Sign In/i })).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  it('displays demo credentials openly and sample household members', () => {
    renderLogin();

    expect(screen.getByText('demo@homie.example')).toBeInTheDocument();
    expect(screen.getByText('demo-house')).toBeInTheDocument();
    expect(screen.getByText(/Alex M\./i)).toBeInTheDocument();
    expect(screen.getByText(/Sam T\./i)).toBeInTheDocument();
    expect(screen.getByText(/Jordan L\./i)).toBeInTheDocument();
  });

  it('one-click "Enter demo directly" establishes session', () => {
    renderLogin();

    expect(hasActiveSession()).toBe(false);
    const enterDemoBtn = screen.getByRole('button', { name: /Enter demo directly/i });
    fireEvent.click(enterDemoBtn);

    expect(hasActiveSession()).toBe(true);
    expect(getSession()?.mode).toBe('demo');
  });

  it('auto-fills demo credentials into form when "Fill demo credentials in form" is clicked', () => {
    renderLogin();

    const fillBtn = screen.getByRole('button', { name: /Fill demo credentials in form/i });
    fireEvent.click(fillBtn);

    const emailInput = screen.getByLabelText(/Email address/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/^Password/i) as HTMLInputElement;

    expect(emailInput.value).toBe('demo@homie.example');
    expect(passwordInput.value).toBe('demo-house');
  });

  it('toggles password visibility with show/hide button', () => {
    renderLogin();

    const passwordInput = screen.getByLabelText(/^Password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByLabelText(/Show password/i);
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');

    const hideBtn = screen.getByLabelText(/Hide password/i);
    fireEvent.click(hideBtn);
    expect(passwordInput.type).toBe('password');
  });

  it('shows error banner linked via aria-describedby when invalid credentials are submitted', () => {
    renderLogin();

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign in with credentials/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@homie.example' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
    fireEvent.click(submitBtn);

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent(/Invalid credentials or household backend unreachable/i);
    expect(emailInput.getAttribute('aria-describedby')).toBe('login-error');
  });

  it('successfully creates session when submitting valid demo credentials through form', () => {
    renderLogin();

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign in with credentials/i });

    fireEvent.change(emailInput, { target: { value: 'demo@homie.example' } });
    fireEvent.change(passwordInput, { target: { value: 'demo-house' } });
    fireEvent.click(submitBtn);

    expect(hasActiveSession()).toBe(true);
    expect(getSession()?.mode).toBe('demo');
  });

  it('shows active session banner when already logged in', () => {
    setSession({ mode: 'demo', startedAt: Date.now() });
    renderLogin();

    expect(screen.getByText(/You have an active demo session/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to dashboard/i })).toBeInTheDocument();
  });
});
