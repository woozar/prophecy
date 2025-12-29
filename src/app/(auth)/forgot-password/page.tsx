'use client';

import { useCallback, useState } from 'react';

import Link from 'next/link';

import { TextInput } from '@mantine/core';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!username) return;

      setIsLoading(true);
      // Password reset: Currently shows success message, API integration pending
      console.log('Password reset for:', username);
      setTimeout(() => {
        setIsLoading(false);
        setIsSubmitted(true);
      }, 1000);
    },
    [username]
  );

  return (
    <Card padding="p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-white">Passwort</span>{' '}
          <span className="text-highlight">vergessen?</span>
        </h1>
        <p className="text-(--text-secondary)">
          {isSubmitted ? 'Deine Anfrage wurde gesendet' : 'Gib deinen Benutzernamen ein'}
        </p>
      </div>

      {isSubmitted ? (
        /* Success State */
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-[rgba(6,182,212,0.1)] border border-[rgba(6,182,212,0.2)]">
            <div className="flex items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-cyan-400 shrink-0 mt-0.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <div>
                <p className="text-foreground font-medium mb-1">Anfrage gesendet</p>
                <p className="text-sm text-(--text-secondary)">
                  Ein Admin wurde über deine Anfrage informiert. Du wirst kontaktiert, sobald dein
                  Passwort zurückgesetzt wurde.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[rgba(16,42,67,0.5)] border border-[rgba(98,125,152,0.3)]">
            <p className="text-sm text-(--text-secondary)">
              <span className="text-cyan-400 font-medium">Tipp:</span> Wenn du einen Passkey
              eingerichtet hast, kannst du dich damit auch ohne Passwort anmelden.
            </p>
          </div>

          <Link href="/login" className="block">
            <Button variant="outline" className="w-full">
              Zurück zum Login
            </Button>
          </Link>
        </div>
      ) : (
        /* Form State */
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextInput
            label="Benutzername"
            placeholder="Dein Benutzername"
            description="Gib den Benutzernamen deines Kontos ein"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <div className="pt-2">
            <Button type="submit" disabled={isLoading || !username} className="w-full">
              {isLoading ? 'Sende Anfrage...' : 'Passwort zurücksetzen'}
            </Button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-(--text-secondary) hover:text-cyan-400 transition-colors"
            >
              Zurück zum Login
            </Link>
          </div>
        </form>
      )}
    </Card>
  );
}
