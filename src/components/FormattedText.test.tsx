import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FormattedText } from './FormattedText';

describe('FormattedText', () => {
  describe('basic rendering', () => {
    it('renders plain text without formatting', () => {
      render(<FormattedText text="Hello world" />);
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('returns null for empty text', () => {
      const { container } = render(<FormattedText text="" />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null for whitespace-only text', () => {
      const { container } = render(<FormattedText text={`   \n   \n   `} />);
      expect(container.firstChild).toBeNull();
    });

    it('applies custom className', () => {
      const { container } = render(<FormattedText text="test" className="custom-class" />);
      expect(container.firstChild).toHaveClass('formatted-text');
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('applies formatted-text base class', () => {
      const { container } = render(<FormattedText text="test" />);
      expect(container.firstChild).toHaveClass('formatted-text');
    });
  });

  describe('line handling', () => {
    it('trims leading and trailing whitespace from lines', () => {
      render(<FormattedText text="   Hello   " />);
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('preserves single line breaks', () => {
      render(<FormattedText text={`Line 1\nLine 2`} />);
      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 2')).toBeInTheDocument();
    });

    it('collapses multiple empty lines into a single empty line', () => {
      const { container } = render(<FormattedText text={`Line 1\n\n\n\nLine 2`} />);
      const emptyDivs = container.querySelectorAll('.h-4');
      expect(emptyDivs.length).toBe(1);
    });

    it('removes leading empty lines', () => {
      render(<FormattedText text={`\n\n\nHello`} />);
      expect(screen.getByText('Hello')).toBeInTheDocument();
      const { container } = render(<FormattedText text={`\n\n\nHello`} />);
      // Should only have the text paragraph, no empty divs before it
      const firstChild = container.querySelector('.formatted-text')?.firstChild;
      expect(firstChild?.nodeName).toBe('P');
    });

    it('removes trailing empty lines', () => {
      const { container } = render(<FormattedText text={`Hello\n\n\n`} />);
      const lastChild = container.querySelector('.formatted-text')?.lastChild;
      expect(lastChild?.nodeName).toBe('P');
    });

    it('trims tabs and spaces from lines', () => {
      render(<FormattedText text={`\t  Hello  \t`} />);
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
  });

  describe('bold formatting (*text*)', () => {
    it('renders text between asterisks as bold', () => {
      render(<FormattedText text="This is *bold* text" />);
      const boldElement = screen.getByText('bold');
      expect(boldElement.tagName).toBe('STRONG');
    });

    it('renders multiple bold sections in one line', () => {
      render(<FormattedText text="*first* and *second*" />);
      expect(screen.getByText('first').tagName).toBe('STRONG');
      expect(screen.getByText('second').tagName).toBe('STRONG');
    });

    it('does not apply bold for unclosed asterisk', () => {
      render(<FormattedText text="This is *not bold" />);
      expect(screen.getByText('This is *not bold')).toBeInTheDocument();
    });

    it('does not apply bold for empty asterisks', () => {
      render(<FormattedText text="This is ** empty" />);
      expect(screen.getByText('This is ** empty')).toBeInTheDocument();
    });
  });

  describe('underline formatting (_text_)', () => {
    it('renders text between underscores as underlined', () => {
      render(<FormattedText text="This is _underlined_ text" />);
      const underlineElement = screen.getByText('underlined');
      expect(underlineElement).toHaveClass('underline');
    });

    it('renders multiple underlined sections in one line', () => {
      render(<FormattedText text="_first_ and _second_" />);
      expect(screen.getByText('first')).toHaveClass('underline');
      expect(screen.getByText('second')).toHaveClass('underline');
    });

    it('does not apply underline for unclosed underscore', () => {
      render(<FormattedText text="This is _not underlined" />);
      expect(screen.getByText('This is _not underlined')).toBeInTheDocument();
    });
  });

  describe('strikethrough formatting (-text-)', () => {
    it('renders text between dashes as strikethrough', () => {
      render(<FormattedText text="This is -deleted- text" />);
      const strikeElement = screen.getByText('deleted');
      expect(strikeElement).toHaveClass('line-through');
    });

    it('renders multiple strikethrough sections in one line', () => {
      render(<FormattedText text="-first- and -second-" />);
      expect(screen.getByText('first')).toHaveClass('line-through');
      expect(screen.getByText('second')).toHaveClass('line-through');
    });

    it('does not apply strikethrough for unclosed dash', () => {
      render(<FormattedText text="This is -not struck" />);
      expect(screen.getByText('This is -not struck')).toBeInTheDocument();
    });
  });

  describe('mixed formatting', () => {
    it('renders different formats in the same line', () => {
      render(<FormattedText text="*bold* and _underline_ and -strike-" />);
      expect(screen.getByText('bold').tagName).toBe('STRONG');
      expect(screen.getByText('underline')).toHaveClass('underline');
      expect(screen.getByText('strike')).toHaveClass('line-through');
    });

    it('handles adjacent formatted sections with space', () => {
      render(<FormattedText text="*bold* _underline_" />);
      expect(screen.getByText('bold').tagName).toBe('STRONG');
      expect(screen.getByText('underline')).toHaveClass('underline');
    });

    it('does not format adjacent markers without space', () => {
      // Without whitespace between markers, formatting is not applied
      render(<FormattedText text="*bold*_underline_" />);
      expect(screen.getByText('*bold*_underline_')).toBeInTheDocument();
    });

    it('does not format hyphenated words like back-to-back', () => {
      render(<FormattedText text="This is back-to-back testing" />);
      // The text should contain "back-to-back" as plain text, not with "to" struck through
      expect(screen.getByText(/back-to-back/)).toBeInTheDocument();
      // There should be no strikethrough elements
      expect(document.querySelector('.line-through')).toBeNull();
    });
  });

  describe('bullet point lists', () => {
    it('renders lines starting with "* " as bullet points when asterisk count is odd', () => {
      render(<FormattedText text={`* First item\n* Second item`} />);
      const lists = screen.getAllByRole('list');
      expect(lists.length).toBe(1);
      const items = screen.getAllByRole('listitem');
      expect(items.length).toBe(2);
    });

    it('renders lines starting with "- " as bullet points when dash count is odd', () => {
      render(<FormattedText text={`- First item\n- Second item`} />);
      const lists = screen.getAllByRole('list');
      expect(lists.length).toBe(1);
      const items = screen.getAllByRole('listitem');
      expect(items.length).toBe(2);
    });

    it('groups consecutive bullet points into a single list', () => {
      render(<FormattedText text={`* Item 1\n* Item 2\n* Item 3`} />);
      expect(screen.getAllByRole('list').length).toBe(1);
      expect(screen.getAllByRole('listitem').length).toBe(3);
    });

    it('creates separate lists for non-consecutive bullets', () => {
      render(<FormattedText text={`* Item 1\nParagraph\n* Item 2`} />);
      expect(screen.getAllByRole('list').length).toBe(2);
    });

    it('does not treat line as bullet if markers can form valid formatting', () => {
      // "* bold *" has 2 asterisks, so could be formatting - treat as text
      render(<FormattedText text="* bold *" />);
      expect(screen.queryByRole('list')).toBeNull();
    });

    it('applies formatting within bullet point content', () => {
      render(<FormattedText text="* This has *bold* text" />);
      const boldElement = screen.getByText('bold');
      expect(boldElement.tagName).toBe('STRONG');
    });
  });

  describe('formatting does not cross line boundaries', () => {
    it('does not apply bold across lines', () => {
      render(<FormattedText text={`*start\nend*`} />);
      expect(screen.getByText('*start')).toBeInTheDocument();
      expect(screen.getByText('end*')).toBeInTheDocument();
    });

    it('does not apply underline across lines', () => {
      render(<FormattedText text={`_start\nend_`} />);
      expect(screen.getByText('_start')).toBeInTheDocument();
      expect(screen.getByText('end_')).toBeInTheDocument();
    });

    it('does not apply strikethrough across lines', () => {
      render(<FormattedText text={`-start\nend-`} />);
      expect(screen.getByText('-start')).toBeInTheDocument();
      expect(screen.getByText('end-')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles text with only formatting markers', () => {
      render(<FormattedText text="***" />);
      expect(screen.getByText('***')).toBeInTheDocument();
    });

    it('handles nested-looking markers (no actual nesting)', () => {
      // Format markers must be surrounded by whitespace, so *bold*extra* is plain text
      render(<FormattedText text="*bold*extra*" />);
      expect(screen.getByText('*bold*extra*')).toBeInTheDocument();
    });

    it('handles markers with proper whitespace boundaries', () => {
      // With whitespace, *bold* is formatted
      render(<FormattedText text="*bold* extra" />);
      expect(screen.getByText('bold').tagName).toBe('STRONG');
    });

    it('handles special characters in formatted text', () => {
      render(<FormattedText text="*hello & goodbye*" />);
      expect(screen.getByText('hello & goodbye').tagName).toBe('STRONG');
    });

    it('handles unicode characters', () => {
      render(<FormattedText text="*émoji 🎉*" />);
      expect(screen.getByText('émoji 🎉').tagName).toBe('STRONG');
    });

    it('handles very long lines', () => {
      const longText = 'a'.repeat(1000);
      render(<FormattedText text={longText} />);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('handles formatted text at line boundaries', () => {
      render(<FormattedText text="*bold at start*" />);
      expect(screen.getByText('bold at start').tagName).toBe('STRONG');
    });

    it('handles text ending with formatting', () => {
      render(<FormattedText text="text *bold*" />);
      expect(screen.getByText('bold').tagName).toBe('STRONG');
    });
  });
});
