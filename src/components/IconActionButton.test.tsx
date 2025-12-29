import { IconBan, IconCheck, IconPencil, IconShield, IconTrash, IconX } from '@tabler/icons-react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { IconActionButton } from './IconActionButton';

// Mock matchMedia
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

describe('IconActionButton', () => {
  it('renders with icon', () => {
    render(<IconActionButton icon={<IconPencil data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders with default variant', () => {
    render(<IconActionButton icon={<IconPencil />} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with edit variant', () => {
    render(<IconActionButton variant="edit" icon={<IconPencil />} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with delete variant', () => {
    render(<IconActionButton variant="delete" icon={<IconTrash />} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with approve variant', () => {
    render(<IconActionButton variant="approve" icon={<IconCheck />} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with reject variant', () => {
    render(<IconActionButton variant="reject" icon={<IconX />} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with ban variant', () => {
    render(<IconActionButton variant="ban" icon={<IconBan />} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with admin variant', () => {
    render(<IconActionButton variant="admin" icon={<IconShield />} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onClick = vi.fn();
    render(<IconActionButton icon={<IconPencil />} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    const onClick = vi.fn();
    render(<IconActionButton icon={<IconPencil />} onClick={onClick} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('passes additional button props', () => {
    render(<IconActionButton icon={<IconPencil />} title="Edit item" />);
    expect(screen.getByTitle('Edit item')).toBeInTheDocument();
  });
});
