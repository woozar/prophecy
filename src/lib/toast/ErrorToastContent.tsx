'use client';

import { memo, useCallback, useState } from 'react';

import { ActionIcon, Group, Stack, Text, Tooltip } from '@mantine/core';

interface ErrorToastContentProps {
  title: string;
  description?: string;
}

const CopyIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const CheckIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const ErrorToastContent = memo(function ErrorToastContent({
  title,
  description,
}: Readonly<ErrorToastContentProps>) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const textToCopy = description ? `${title}\n${description}` : title;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers - clipboard API failed silently
      // Note: execCommand is deprecated but kept as last resort fallback
      try {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy'); // NOSONAR - deprecated but necessary fallback
        textarea.remove();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Copy failed completely - do nothing
      }
    }
  }, [title, description]);

  return (
    <Group gap="sm" wrap="nowrap" align="center">
      <Stack gap={4} style={{ flex: 1 }}>
        <Text size="sm" fw={600} c="#f87171">
          {title}
        </Text>
        {description && (
          <Text size="xs" c="#9fb3c8">
            {description}
          </Text>
        )}
      </Stack>
      <Tooltip label={copied ? 'Kopiert!' : 'Kopieren'} withArrow position="left">
        <ActionIcon
          variant="subtle"
          size="md"
          onClick={handleCopy}
          aria-label="Fehlermeldung kopieren"
          className="error-toast-copy-btn"
          style={{
            color: copied ? '#22c55e' : '#627d98',
            transition: 'color 0.2s ease',
          }}
        >
          {copied ? CheckIcon : CopyIcon}
        </ActionIcon>
      </Tooltip>
    </Group>
  );
});

// Wrapper for use in Mantine notifications
export function createErrorToastContent(title: string, description?: string) {
  return <ErrorToastContent title={title} description={description} />;
}
