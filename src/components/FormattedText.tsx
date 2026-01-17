'use client';

import { memo, useMemo } from 'react';

interface FormattedTextProps {
  /** The text to format */
  text: string;
  /** Additional CSS classes */
  className?: string;
}

interface ParsedLine {
  type: 'text' | 'bullet';
  segments: FormattedSegment[];
}

interface FormattedSegment {
  text: string;
  bold?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

/**
 * Trims each line and collapses multiple consecutive empty lines into a single empty line.
 */
function normalizeLines(text: string): string[] {
  const lines = text.split('\n').map((line) => line.trim());
  const result: string[] = [];
  let lastWasEmpty = false;

  for (const line of lines) {
    const isEmpty = line === '';
    if (isEmpty) {
      if (!lastWasEmpty) {
        result.push('');
      }
      lastWasEmpty = true;
    } else {
      result.push(line);
      lastWasEmpty = false;
    }
  }

  // Remove leading/trailing empty lines
  while (result.length > 0 && result[0] === '') {
    result.shift();
  }
  while (result.length > 0 && result.at(-1) === '') {
    result.pop();
  }

  return result;
}

/**
 * Counts occurrences of a character in a string.
 */
function countChar(str: string, char: string): number {
  let count = 0;
  for (const c of str) {
    if (c === char) count++;
  }
  return count;
}

/**
 * Checks if a line should be treated as a bullet point.
 * A line is a bullet point if:
 * - It starts with * or -
 * - AND has an odd number of that character (so formatting can't be applied)
 */
function isBulletLine(line: string): { isBullet: boolean; content: string; marker: string } {
  if (line.startsWith('* ') || line.startsWith('- ')) {
    const marker = line[0];
    const content = line.slice(2);
    // If odd number of markers in line, it can't be properly formatted, so treat as bullet
    if (countChar(line, marker) % 2 !== 0) {
      return { isBullet: true, content, marker };
    }
  }
  return { isBullet: false, content: line, marker: '' };
}

const FORMAT_MARKERS = [
  { marker: '*', prop: 'bold' as const },
  { marker: '_', prop: 'underline' as const },
  { marker: '-', prop: 'strikethrough' as const },
] as const;

type FormatProp = (typeof FORMAT_MARKERS)[number]['prop'];

interface FormatMatch {
  prop: FormatProp;
  text: string;
  endIndex: number;
}

/**
 * Checks if a character is whitespace or undefined (for start/end of string).
 */
function isWhitespaceOrBoundary(char: string | undefined): boolean {
  return char === undefined || char === ' ' || char === '\t';
}

/**
 * Tries to find a valid format match at the start of the text.
 * Returns null if no valid format is found.
 *
 * Format markers are only valid when:
 * - The opening marker is preceded by whitespace or start of line (prevChar)
 * - The closing marker is followed by whitespace or end of line
 */
function tryMatchFormat(text: string, prevChar: string | undefined): FormatMatch | null {
  for (const { marker, prop } of FORMAT_MARKERS) {
    if (!text.startsWith(marker)) continue;

    // Opening marker must be preceded by whitespace or line start
    if (!isWhitespaceOrBoundary(prevChar)) continue;

    const closeIndex = text.indexOf(marker, 1);
    if (closeIndex <= 1) continue;

    const formattedText = text.slice(1, closeIndex);
    if (formattedText.includes('\n')) continue;

    // Closing marker must be followed by whitespace or line end
    const charAfterClose = text[closeIndex + 1];
    if (!isWhitespaceOrBoundary(charAfterClose)) continue;

    return { prop, text: formattedText, endIndex: closeIndex + 1 };
  }
  return null;
}

/**
 * Parses inline formatting within a line.
 * Supports: *bold*, _underline_, -strikethrough-
 * Formatting is only applied within a single line (no newlines in formatted content).
 * Format markers must be surrounded by whitespace or line boundaries.
 */
function parseInlineFormatting(line: string): FormattedSegment[] {
  const segments: FormattedSegment[] = [];
  let remaining = line;
  let currentSegment: FormattedSegment = { text: '' };
  let prevChar: string | undefined = undefined;

  while (remaining.length > 0) {
    const match = tryMatchFormat(remaining, prevChar);

    if (match) {
      if (currentSegment.text) {
        segments.push(currentSegment);
        currentSegment = { text: '' };
      }
      segments.push({ text: match.text, [match.prop]: true });
      prevChar = remaining[match.endIndex - 1]; // The closing marker
      remaining = remaining.slice(match.endIndex);
    } else {
      prevChar = remaining[0];
      currentSegment.text += remaining[0];
      remaining = remaining.slice(1);
    }
  }

  if (currentSegment.text) {
    segments.push(currentSegment);
  }

  return segments.length > 0 ? segments : [{ text: '' }];
}

/**
 * Parses a single line into a ParsedLine structure.
 */
function parseLine(line: string): ParsedLine {
  const bulletCheck = isBulletLine(line);

  if (bulletCheck.isBullet) {
    return {
      type: 'bullet',
      segments: parseInlineFormatting(bulletCheck.content),
    };
  }

  return {
    type: 'text',
    segments: parseInlineFormatting(line),
  };
}

/**
 * Renders a single formatted segment.
 */
function renderSegment(segment: FormattedSegment, index: number): React.ReactNode {
  let content: React.ReactNode = segment.text;

  if (segment.bold) {
    content = <strong key={`bold-${index}`}>{content}</strong>;
  }
  if (segment.underline) {
    content = (
      <span key={`underline-${index}`} className="underline">
        {content}
      </span>
    );
  }
  if (segment.strikethrough) {
    content = (
      <span key={`strike-${index}`} className="line-through">
        {content}
      </span>
    );
  }

  // If no formatting was applied, wrap in a fragment with key
  if (!segment.bold && !segment.underline && !segment.strikethrough) {
    return <span key={`text-${index}`}>{content}</span>;
  }

  return content;
}

/**
 * FormattedText component that renders text with basic formatting support.
 *
 * Supported formatting (within a single line only):
 * - *text* → bold
 * - _text_ → underline
 * - -text- → strikethrough
 *
 * Line handling:
 * - Lines are trimmed
 * - Multiple consecutive empty lines collapse to a single empty line
 * - Lines starting with * or - (followed by space) with odd marker count become bullet points
 */
export const FormattedText = memo(function FormattedText({
  text,
  className = '',
}: Readonly<FormattedTextProps>) {
  const parsedContent = useMemo(() => {
    if (!text) return [];

    const lines = normalizeLines(text);
    return lines.map((line) => parseLine(line));
  }, [text]);

  const containerClassName = useMemo(() => {
    return className ? `formatted-text ${className}` : 'formatted-text';
  }, [className]);

  if (!text || parsedContent.length === 0) {
    return null;
  }

  // Group consecutive bullet points into lists
  const elements: React.ReactNode[] = [];
  let currentBullets: { key: number; parsed: ParsedLine }[] = [];
  let elementKey = 0;

  const flushBullets = () => {
    if (currentBullets.length > 0) {
      elements.push(
        <ul key={`list-${elementKey++}`} className="list-disc list-inside space-y-1">
          {currentBullets.map((bullet) => (
            <li key={`bullet-${bullet.key}`}>{bullet.parsed.segments.map(renderSegment)}</li>
          ))}
        </ul>
      );
      currentBullets = [];
    }
  };

  for (const parsed of parsedContent) {
    if (parsed.type === 'bullet') {
      currentBullets.push({ key: elementKey++, parsed });
    } else {
      flushBullets();

      const isEmptyLine = parsed.segments.length === 1 && parsed.segments[0].text === '';

      if (isEmptyLine) {
        elements.push(<div key={`empty-${elementKey++}`} className="h-4" />);
      } else {
        elements.push(<p key={`line-${elementKey++}`}>{parsed.segments.map(renderSegment)}</p>);
      }
    }
  }

  flushBullets();

  return <div className={containerClassName}>{elements}</div>;
});
