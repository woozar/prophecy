import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RequiredAsterisk } from './RequiredAsterisk';

describe('RequiredAsterisk', () => {
  it('renders asterisk symbol', () => {
    render(<RequiredAsterisk />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders as span element', () => {
    render(<RequiredAsterisk />);
    const element = screen.getByText('*');
    expect(element.tagName).toBe('SPAN');
  });

  it('has correct styling classes', () => {
    render(<RequiredAsterisk />);
    const element = screen.getByText('*');
    expect(element).toHaveClass('ml-1', 'text-violet-300');
  });
});
