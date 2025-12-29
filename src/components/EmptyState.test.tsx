import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders simple message without extras', () => {
    render(<EmptyState message="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders message as paragraph in simple mode', () => {
    const { container } = render(<EmptyState message="Simple message" />);
    const paragraph = container.querySelector('p');
    expect(paragraph).toHaveTextContent('Simple message');
  });

  it('renders message as heading when icon is provided', () => {
    render(<EmptyState message="With icon" icon={<span data-testid="test-icon">Icon</span>} />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('With icon');
  });

  it('renders icon when provided', () => {
    render(<EmptyState message="Test" icon={<span data-testid="custom-icon">🔍</span>} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState message="No results" description="Try adjusting your search criteria" />);
    expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(
      <EmptyState message="Empty" action={<button data-testid="action-btn">Add new</button>} />
    );
    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
  });

  it('uses default padding p-8', () => {
    const { container } = render(<EmptyState message="Test" />);
    expect(container.querySelector('.p-8')).toBeInTheDocument();
  });

  it('accepts custom padding p-6', () => {
    const { container } = render(<EmptyState message="Test" padding="p-6" />);
    expect(container.querySelector('.p-6')).toBeInTheDocument();
  });

  it('renders with all props combined', () => {
    render(
      <EmptyState
        message="No prophecies yet"
        icon={<span data-testid="icon">📜</span>}
        description="Create your first prophecy to get started"
        action={<button>Create Prophecy</button>}
        padding="p-6"
      />
    );

    expect(screen.getByText('No prophecies yet')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Create your first prophecy to get started')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Prophecy' })).toBeInTheDocument();
  });

  it('renders heading as h2 with proper styling in full mode', () => {
    render(<EmptyState message="Heading test" description="Some description" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveClass('text-xl', 'font-semibold', 'text-white');
  });

  it('centers content in full mode', () => {
    const { container } = render(<EmptyState message="Centered" icon={<span>Icon</span>} />);
    expect(container.querySelector('.text-center')).toBeInTheDocument();
  });

  it('renders icon container with proper styling', () => {
    const { container } = render(<EmptyState message="Test" icon={<span>Icon</span>} />);
    const iconContainer = container.querySelector('.w-16.h-16');
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer).toHaveClass('rounded-full', 'mx-auto', 'mb-4');
  });

  it('wraps action in div with margin-top', () => {
    const { container } = render(<EmptyState message="Test" action={<button>Action</button>} />);
    const actionWrapper = container.querySelector('.mt-4');
    expect(actionWrapper).toBeInTheDocument();
  });
});
