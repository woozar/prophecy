import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type IndividualRating, IndividualRatingsBox } from './IndividualRatingsBox';

// Mock useUser hook
vi.mock('@/hooks/useUser', () => ({
  useUser: () => null,
}));

describe('IndividualRatingsBox', () => {
  const mockRatings: IndividualRating[] = [
    {
      id: '1',
      userId: 'user1',
      value: 7,
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
      isBot: false,
    },
    {
      id: '2',
      userId: 'user2',
      value: -3,
      username: 'bob',
      displayName: 'Bob',
      avatarUrl: null,
      isBot: false,
    },
    {
      id: '3',
      userId: 'bot1',
      value: 5,
      username: 'kimberly',
      displayName: 'Kimberly',
      avatarUrl: null,
      isBot: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when ratings array is empty', () => {
    const { container } = render(<IndividualRatingsBox ratings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders collapsed by default with toggle button', () => {
    render(<IndividualRatingsBox ratings={mockRatings} />);

    expect(screen.getByRole('button')).toHaveTextContent('Einzelbewertungen anzeigen');
    // All ratings are in the DOM but the container has maxHeight 0
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('expands to show ratings when clicked', () => {
    render(<IndividualRatingsBox ratings={mockRatings} />);

    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    // All ratings should be in the document
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Kimberly')).toBeInTheDocument();
  });

  it('displays positive ratings with + prefix', () => {
    render(<IndividualRatingsBox ratings={mockRatings} />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('+7')).toBeInTheDocument();
  });

  it('displays negative ratings without + prefix', () => {
    render(<IndividualRatingsBox ratings={mockRatings} />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('-3')).toBeInTheDocument();
  });

  it('marks bot ratings with robot icon and tooltip', () => {
    render(<IndividualRatingsBox ratings={mockRatings} />);
    fireEvent.click(screen.getByRole('button'));

    // Find the bot indicator by its title
    const botIndicator = screen.getByTitle('Bot - wird im Durchschnitt nicht berücksichtigt');
    expect(botIndicator).toBeInTheDocument();
  });

  it('shows bot disclaimer when bots are present', () => {
    render(<IndividualRatingsBox ratings={mockRatings} />);
    fireEvent.click(screen.getByRole('button'));

    expect(
      screen.getByText('Bot-Bewertungen werden im Durchschnitt nicht berücksichtigt')
    ).toBeInTheDocument();
  });

  it('does not show bot disclaimer when no bots are present', () => {
    const humanOnlyRatings = mockRatings.filter((r) => !r.isBot);
    render(<IndividualRatingsBox ratings={humanOnlyRatings} />);
    fireEvent.click(screen.getByRole('button'));

    expect(
      screen.queryByText('Bot-Bewertungen werden im Durchschnitt nicht berücksichtigt')
    ).not.toBeInTheDocument();
  });

  it('sorts ratings by value descending', () => {
    render(<IndividualRatingsBox ratings={mockRatings} />);
    fireEvent.click(screen.getByRole('button'));

    const ratingValues = screen.getAllByText(/^[+-]?\d+$/);
    const values = ratingValues.map((el) => parseInt(el.textContent || '0', 10));

    // Should be sorted: 7, 5, -3
    expect(values).toEqual([7, 5, -3]);
  });

  it('uses username when displayName is null', () => {
    const ratingsWithNoDisplayName: IndividualRating[] = [
      {
        id: '1',
        userId: 'user1',
        value: 5,
        username: 'testuser',
        displayName: null,
        avatarUrl: null,
        isBot: false,
      },
    ];

    render(<IndividualRatingsBox ratings={ratingsWithNoDisplayName} />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('shows "Meine" tag for current user rating', () => {
    render(<IndividualRatingsBox ratings={mockRatings} currentUserId="user1" />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Meine')).toBeInTheDocument();
  });

  it('does not show "Meine" tag when no currentUserId is provided', () => {
    render(<IndividualRatingsBox ratings={mockRatings} />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.queryByText('Meine')).not.toBeInTheDocument();
  });

  it('sorts by value descending, then alphabetically by name', () => {
    const ratingsWithSameValue: IndividualRating[] = [
      {
        id: '1',
        userId: 'user1',
        value: 5,
        username: 'zara',
        displayName: 'Zara',
        avatarUrl: null,
        isBot: false,
      },
      {
        id: '2',
        userId: 'user2',
        value: 5,
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
        isBot: false,
      },
      {
        id: '3',
        userId: 'user3',
        value: 5,
        username: 'bob',
        displayName: 'Bob',
        avatarUrl: null,
        isBot: false,
      },
    ];

    render(<IndividualRatingsBox ratings={ratingsWithSameValue} />);
    fireEvent.click(screen.getByRole('button'));

    const names = screen.getAllByText(/^(Alice|Bob|Zara)$/);
    expect(names.map((el) => el.textContent)).toEqual(['Alice', 'Bob', 'Zara']);
  });
});
