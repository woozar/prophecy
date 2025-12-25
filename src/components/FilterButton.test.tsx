import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilterButton } from './FilterButton';

describe('FilterButton', () => {
  it('renders children text', () => {
    render(<FilterButton>Alle (5)</FilterButton>);
    expect(screen.getByText('Alle (5)')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<FilterButton onClick={handleClick}>Filter</FilterButton>);

    fireEvent.click(screen.getByText('Filter'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies active styling when active prop is true', () => {
    const { container } = render(<FilterButton active>Active Filter</FilterButton>);
    const button = container.querySelector('button');

    expect(button).toHaveClass('bg-cyan-500/20');
    expect(button).toHaveClass('text-cyan-400');
  });

  it('applies inactive styling when active prop is false', () => {
    const { container } = render(<FilterButton active={false}>Inactive Filter</FilterButton>);
    const button = container.querySelector('button');

    expect(button).toHaveClass('bg-[rgba(98,125,152,0.15)]');
    expect(button).not.toHaveClass('bg-cyan-500/20');
  });

  it('defaults to inactive state', () => {
    const { container } = render(<FilterButton>Default Filter</FilterButton>);
    const button = container.querySelector('button');

    expect(button).not.toHaveClass('bg-cyan-500/20');
  });

  it('can be disabled', () => {
    const handleClick = vi.fn();
    render(
      <FilterButton onClick={handleClick} disabled>
        Disabled
      </FilterButton>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
