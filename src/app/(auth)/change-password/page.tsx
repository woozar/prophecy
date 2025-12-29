'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PasswordInput } from '@/components/PasswordInput';
import { apiClient } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';
import { useUserStore } from '@/store/useUserStore';

export default function ChangePasswordPage() {
  const router = useRouter();

  const currentUserId = useUserStore((state) => state.currentUserId);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasExistingPassword, setHasExistingPassword] = useState(true);
  const [forceChange, setForceChange] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Redirect if not logged in, check if user has password and forceChange status
  useEffect(() => {
    if (!currentUserId) {
      router.push('/login');
      return;
    }

    // Check password status from API
    const checkPasswordStatus = async () => {
      try {
        const { data } = await apiClient.user.passwordLogin.get();
        if (data) {
          setHasExistingPassword(data.passwordLoginEnabled);
          setForceChange(data.forcePasswordChange ?? false);
        }
      } catch {
        // Assume has password on error
      } finally {
        setIsLoading(false);
      }
    };

    checkPasswordStatus();
  }, [currentUserId, router]);

  // Skip current password if forceChange OR no existing password
  const skipCurrentPassword = forceChange || !hasExistingPassword;

  const validate = useCallback(() => {
    const newErrors: typeof errors = {};

    if (!skipCurrentPassword && !currentPassword) {
      newErrors.currentPassword = 'Aktuelles Passwort erforderlich';
    }

    if (!newPassword) {
      newErrors.newPassword = 'Neues Passwort erforderlich';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Mindestens 8 Zeichen';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Passwort bestätigen';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [skipCurrentPassword, currentPassword, newPassword, confirmPassword]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      setIsSubmitting(true);

      try {
        const { error } = await apiClient.auth.changePassword(
          skipCurrentPassword ? undefined : currentPassword,
          newPassword,
          confirmPassword
        );

        if (error) {
          showErrorToast((error as { error?: string }).error || 'Fehler beim Ändern des Passworts');
          return;
        }

        showSuccessToast(
          hasExistingPassword ? 'Passwort erfolgreich geändert' : 'Passwort erfolgreich gesetzt'
        );
        router.push('/profile');
      } catch {
        showErrorToast('Verbindungsfehler');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      validate,
      skipCurrentPassword,
      hasExistingPassword,
      currentPassword,
      newPassword,
      confirmPassword,
      router,
    ]
  );

  if (!currentUserId || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <p className="text-center text-(--text-muted)">Laden...</p>
        </Card>
      </div>
    );
  }

  const isSettingNewPassword = !hasExistingPassword;

  const getTitle = () => {
    if (forceChange) return 'Neues Passwort setzen';
    if (isSettingNewPassword) return 'Passwort setzen';
    return 'Passwort ändern';
  };

  const getButtonText = () => {
    if (isSubmitting) return 'Wird gespeichert...';
    if (isSettingNewPassword) return 'Passwort setzen';
    return 'Passwort ändern';
  };

  const title = getTitle();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        {forceChange && (
          <p className="text-(--text-muted) mb-6">
            Dein Passwort wurde zurückgesetzt. Bitte wähle ein neues Passwort.
          </p>
        )}
        {isSettingNewPassword && !forceChange && (
          <p className="text-(--text-muted) mb-6">
            Du hast noch kein Passwort. Setze jetzt ein Passwort für deinen Account.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!skipCurrentPassword && (
            <PasswordInput
              label="Aktuelles Passwort"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={errors.currentPassword}
              autoComplete="current-password"
            />
          )}

          <PasswordInput
            label="Neues Passwort"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
            autoComplete="new-password"
          />

          <PasswordInput
            label="Passwort bestätigen"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {getButtonText()}
          </Button>

          {!forceChange && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.back()}
            >
              Abbrechen
            </Button>
          )}
        </form>
      </Card>
    </div>
  );
}
