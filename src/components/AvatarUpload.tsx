'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/Button';
import { AvatarPreview, type AvatarEffect } from '@/components/UserAvatar';
import { showSuccessToast, showErrorToast } from '@/lib/toast/toast';

interface AvatarUploadProps {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  avatarEffect?: string | null;
  avatarEffectColors?: string[];
  onAvatarChange: (url: string | null) => void;
}

export const AvatarUpload = memo(function AvatarUpload({
  username,
  displayName,
  avatarUrl,
  avatarEffect,
  avatarEffectColors = [],
  onAvatarChange,
}: Readonly<AvatarUploadProps>) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch('/api/users/me/avatar', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Upload fehlgeschlagen');
        }

        const { avatarUrl: newUrl } = await response.json();
        onAvatarChange(newUrl);
        showSuccessToast('Avatar hochgeladen');
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Upload fehlgeschlagen');
      } finally {
        setIsUploading(false);
      }
    },
    [onAvatarChange]
  );

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/users/me/avatar', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Löschen fehlgeschlagen');
      }

      onAvatarChange(null);
      showSuccessToast('Avatar entfernt');
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Löschen fehlgeschlagen');
    } finally {
      setIsDeleting(false);
    }
  }, [onAvatarChange]);

  const dropzoneStyle = useMemo(
    () => ({
      backgroundColor: 'rgba(16, 42, 67, 0.5)',
      borderColor: 'rgba(6, 182, 212, 0.3)',
      borderStyle: 'dashed' as const,
      borderWidth: 2,
      borderRadius: 12,
    }),
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <AvatarPreview
          username={username}
          displayName={displayName}
          avatarUrl={avatarUrl}
          avatarEffect={avatarEffect as AvatarEffect | null}
          avatarEffectColors={avatarEffectColors}
          size="xl"
        />
        <div className="flex-1">
          <Dropzone
            onDrop={handleDrop}
            accept={IMAGE_MIME_TYPE}
            maxSize={5 * 1024 * 1024}
            multiple={false}
            loading={isUploading}
            style={dropzoneStyle}
            className="hover:border-cyan-400/50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center py-4 gap-2">
              <Dropzone.Accept>
                <IconUpload size={32} className="text-cyan-400" />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX size={32} className="text-red-400" />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconPhoto size={32} className="text-(--text-muted)" />
              </Dropzone.Idle>

              <div className="text-center">
                <p className="text-sm text-(--text-secondary)">Bild hier ablegen oder klicken</p>
                <p className="text-xs text-(--text-muted)">Max. 5MB (JPEG, PNG, WebP, GIF)</p>
              </div>
            </div>
          </Dropzone>
        </div>
      </div>

      {avatarUrl && (
        <Button
          variant="ghost"
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <IconTrash size={16} />
          {isDeleting ? 'Wird entfernt...' : 'Avatar entfernen'}
        </Button>
      )}
    </div>
  );
});
