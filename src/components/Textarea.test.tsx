import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('renders textarea element', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Textarea label="Description" id="desc" />);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('associates label with textarea via id', () => {
    render(<Textarea label="Description" id="desc" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('id', 'desc');
  });

  it('shows required asterisk when required', () => {
    render(<Textarea label="Required field" required id="req" />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not show asterisk when not required', () => {
    render(<Textarea label="Optional field" id="opt" />);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    render(<Textarea error="This field has an error" />);
    expect(screen.getByText('This field has an error')).toBeInTheDocument();
  });

  it('applies error styling when error is present', () => {
    const { container } = render(<Textarea error="Error" />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveClass('border-red-500/50');
  });

  it('applies normal styling when no error', () => {
    const { container } = render(<Textarea />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveClass('border-[rgba(98,125,152,0.3)]');
  });

  it('calls onChange when text is entered', () => {
    const handleChange = vi.fn();
    render(<Textarea onChange={handleChange} />);
    const textarea = screen.getByRole('textbox');

    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    expect(handleChange).toHaveBeenCalled();
  });

  it('accepts placeholder text', () => {
    render(<Textarea placeholder="Enter your text..." />);
    expect(screen.getByPlaceholderText('Enter your text...')).toBeInTheDocument();
  });

  it('accepts rows prop', () => {
    render(<Textarea rows={5} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('can be disabled', () => {
    render(<Textarea disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('displays controlled value', () => {
    render(<Textarea value="Controlled value" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('Controlled value');
  });

  it('renders without label', () => {
    const { container } = render(<Textarea />);
    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('accepts ReactNode as error prop', () => {
    render(<Textarea error={<span data-testid="custom-error">Custom error</span>} />);
    expect(screen.getByTestId('custom-error')).toBeInTheDocument();
  });

  it('passes through additional props', () => {
    render(<Textarea data-testid="custom-textarea" maxLength={100} />);
    const textarea = screen.getByTestId('custom-textarea');
    expect(textarea).toHaveAttribute('maxLength', '100');
  });
});
