import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
  it('renders password input element', () => {
    render(<PasswordInput />);
    const input = document.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<PasswordInput label="Password" />);
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('shows required indicator when required prop is true', () => {
    render(<PasswordInput label="Password" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<PasswordInput description="Must be at least 8 characters" />);
    expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(<PasswordInput error="Password is too short" />);
    expect(screen.getByText('Password is too short')).toBeInTheDocument();
  });

  it('toggles password visibility when toggle button is clicked', () => {
    render(<PasswordInput />);
    const input = document.querySelector('input');
    const toggleButton = screen.getByRole('button', { name: 'Passwort anzeigen' });

    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Passwort verbergen' })).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('calls onChange handler when input value changes', () => {
    const handleChange = vi.fn();
    render(<PasswordInput onChange={handleChange} />);
    const input = document.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'secret' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<PasswordInput disabled />);
    const input = document.querySelector('input');
    const toggleButton = screen.getByRole('button');
    expect(input).toBeDisabled();
    expect(toggleButton).toBeDisabled();
  });

  it('accepts placeholder text', () => {
    render(<PasswordInput placeholder="Enter password..." />);
    const input = screen.getByPlaceholderText('Enter password...');
    expect(input).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<PasswordInput ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('toggle button has tabIndex -1', () => {
    render(<PasswordInput />);
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toHaveAttribute('tabIndex', '-1');
  });
});
