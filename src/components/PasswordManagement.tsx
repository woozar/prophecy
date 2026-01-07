'use client';

import { memo, useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { IconKey, IconKeyOff } from '@tabler/icons-react';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmModal } from '@/components/ConfirmModal';
import { apiClient } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';

interface PasswordManagementProps {
  hasPasskeys: boolean;
}

export const PasswordManagement = memo(function PasswordManagement({
  hasPasskeys,
}: PasswordManagementProps) {
  const router = useRouter();
  const [passwordLoginEnabled, setPasswordLoginEnabled] = useState<boolean | null>(null);
  const [canDisable, setCanDisable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisabling, setIsDisabling] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await apiClient.user.passwordLogin.get();
        if (data) {
          setPasswordLoginEnabled(data.passwordLoginEnabled);
          setCanDisable(data.canDisablePasswordLogin);
        }
      } catch {
        // Silently fail - just show loading state
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const handleDisablePasswordLogin = useCallback(async () => {
    setIsDisabling(true);
    try {
      const { data, error } = await apiClient.user.passwordLogin.toggle(false);

      if (error) {
        showErrorToast((error as { error?: string }).error || 'Fehler beim Deaktivieren');
        return;
      }

      if (data) {
        setPasswordLoginEnabled(false);
        setShowDisableModal(false);
        showSuccessToast('Passwort-Login wurde deaktiviert');
      }
    } catch {
      showErrorToast('Verbindungsfehler');
    } finally {
      setIsDisabling(false);
    }
  }, []);

  if (isLoading) {
    return (
      <Card padding="p-6">
        <h3 className="text-lg font-semibold text-cyan-400 mb-4">Passwort</h3>
        <p className="text-(--text-muted)">Laden...</p>
      </Card>
    );
  }

  return (
    <>
      <Card padding="p-6">
        <h3 className="text-lg font-semibold text-cyan-400 mb-4">Passwort</h3>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {passwordLoginEnabled ? (
                <>
                  <IconKey size={20} className="text-cyan-400" />
                  <span className="text-(--text-secondary)">Passwort-Login aktiv</span>
                </>
              ) : (
                <>
                  <IconKeyOff size={20} className="text-(--text-muted)" />
                  <span className="text-(--text-muted)">Passwort-Login deaktiviert</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {passwordLoginEnabled && (
              <Button variant="outline" onClick={() => router.push('/change-password')}>
                Passwort ändern
              </Button>
            )}

            {passwordLoginEnabled && canDisable && hasPasskeys && (
              <Button variant="outline" onClick={() => setShowDisableModal(true)}>
                Passwort-Login deaktivieren
              </Button>
            )}

            {!passwordLoginEnabled && (
              <Button variant="outline" onClick={() => router.push('/change-password')}>
                Passwort setzen
              </Button>
            )}
          </div>

          {!hasPasskeys && passwordLoginEnabled && (
            <p className="text-sm text-(--text-muted)">
              Füge mindestens einen Passkey hinzu, um Passwort-Login deaktivieren zu können.
            </p>
          )}
        </div>
      </Card>

      <ConfirmModal
        opened={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        onConfirm={handleDisablePasswordLogin}
        title="Passwort-Login deaktivieren?"
        confirmText={isDisabling ? 'Wird deaktiviert...' : 'Deaktivieren'}
        isSubmitting={isDisabling}
        variant="danger"
      >
        <div className="space-y-3">
          <p className="text-(--text-secondary)">
            Wenn du Passwort-Login deaktivierst, kannst du dich nur noch mit deinen Passkeys
            anmelden. Dein aktuelles Passwort wird gelöscht.
          </p>
          <p className="text-yellow-400 text-sm">
            Stelle sicher, dass du Zugriff auf deine Passkeys hast!
          </p>
        </div>
      </ConfirmModal>
    </>
  );
});
