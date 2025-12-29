import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TextInput } from './TextInput';

describe('TextInput', () => {
  it('renders input element', () => {
    render(<TextInput />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<TextInput label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('associates label with input correctly', () => {
    render(<TextInput label="Username" id="username-input" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'username-input');
  });

  it('shows required indicator when required prop is true', () => {
    render(<TextInput label="Name" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<TextInput description="Enter your email address" />);
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(<TextInput error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('calls onChange handler when input value changes', () => {
    const handleChange = vi.fn();
    render(<TextInput onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<TextInput disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('accepts placeholder text', () => {
    render(<TextInput placeholder="Enter text..." />);
    const input = screen.getByPlaceholderText('Enter text...');
    expect(input).toBeInTheDocument();
  });

  it('passes through additional HTML attributes', () => {
    render(<TextInput data-testid="custom-input" maxLength={50} />);
    const input = screen.getByTestId('custom-input');
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('merges custom className', () => {
    render(<TextInput className="custom-class" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input.className).toContain('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<TextInput ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
