import createClient from 'openapi-fetch';

import type { paths } from './generated/api';

/**
 * Low-level OpenAPI fetch client.
 * Use apiClient for a more ergonomic API.
 */
export const api = createClient<paths>({
  baseUrl: globalThis.window === undefined ? process.env.NEXT_PUBLIC_API_URL || '' : '',
  credentials: 'include', // Include session cookies
});

// Helper types for request bodies
type RequestBody<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends {
  requestBody?: { content: { 'application/json': infer B } };
}
  ? B
  : never;

/**
 * Typed API client with convenient methods for all endpoints.
 */
export const apiClient = {
  // ============================================================================
  // Initial Data (for SSE)
  // ============================================================================
  initialData: {
    get: () => api.GET('/api/initial-data'),
  },

  // ============================================================================
  // Auth
  // ============================================================================
  auth: {
    loginPassword: (username: string, password: string) =>
      api.POST('/api/auth/login/password', { body: { username, password } }),

    loginOptions: (username?: string) =>
      api.POST('/api/auth/login/options', { body: { username } }),

    loginVerify: (
      credential: RequestBody<'/api/auth/login/verify', 'post'>['credential'],
      challengeKey: string
    ) => api.POST('/api/auth/login/verify', { body: { credential, challengeKey } }),

    registerPassword: (username: string, password: string, displayName?: string) =>
      api.POST('/api/auth/register/password', { body: { username, password, displayName } }),

    registerOptions: (username: string, displayName?: string) =>
      api.POST('/api/auth/register/options', { body: { username, displayName } }),

    registerVerify: (
      credential: RequestBody<'/api/auth/register/verify', 'post'>['credential'],
      tempUserId: string,
      username: string,
      displayName: string
    ) =>
      api.POST('/api/auth/register/verify', {
        body: { credential, tempUserId, username, displayName },
      }),

    changePassword: (
      currentPassword: string | undefined,
      newPassword: string,
      confirmPassword: string
    ) =>
      api.POST('/api/auth/change-password', {
        body: { currentPassword, newPassword, confirmPassword },
      }),

    logout: () => api.POST('/api/auth/logout'),
  },

  // ============================================================================
  // Rounds
  // ============================================================================
  rounds: {
    list: () => api.GET('/api/rounds'),

    get: (id: string) => api.GET('/api/rounds/{id}', { params: { path: { id } } }),

    create: (data: RequestBody<'/api/rounds', 'post'>) => api.POST('/api/rounds', { body: data }),

    update: (id: string, data: RequestBody<'/api/rounds/{id}', 'put'>) =>
      api.PUT('/api/rounds/{id}', { params: { path: { id } }, body: data }),

    delete: (id: string) => api.DELETE('/api/rounds/{id}', { params: { path: { id } } }),

    getStatistics: (id: string) =>
      api.GET('/api/rounds/{id}/statistics', { params: { path: { id } } }),

    publishResults: (id: string) =>
      api.POST('/api/rounds/{id}/publish-results', { params: { path: { id } } }),

    unpublishResults: (id: string) =>
      api.DELETE('/api/rounds/{id}/publish-results', { params: { path: { id } } }),

    // Export as Excel file (Admin only)
    export: (id: string) =>
      fetch(`/api/rounds/${id}/export`, { credentials: 'include' }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          return { data: null, error, response: res };
        }
        const blob = await res.blob();
        const contentDisposition = res.headers.get('Content-Disposition');
        const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'export.xlsx';
        return { data: { blob, filename }, error: null, response: res };
      }),
  },

  // ============================================================================
  // Prophecies
  // ============================================================================
  prophecies: {
    list: (roundId?: string, filter?: 'mine' | 'toRate') =>
      api.GET('/api/prophecies', { params: { query: { roundId, filter } } }),

    create: (data: RequestBody<'/api/prophecies', 'post'>) =>
      api.POST('/api/prophecies', { body: data }),

    update: (id: string, data: RequestBody<'/api/prophecies/{id}', 'put'>) =>
      api.PUT('/api/prophecies/{id}', { params: { path: { id } }, body: data }),

    delete: (id: string) => api.DELETE('/api/prophecies/{id}', { params: { path: { id } } }),

    rate: (id: string, value: number) =>
      api.POST('/api/prophecies/{id}/rate', { params: { path: { id } }, body: { value } }),

    resolve: (id: string, fulfilled: boolean) =>
      api.POST('/api/prophecies/{id}/resolve', { params: { path: { id } }, body: { fulfilled } }),

    resetResolution: (id: string) =>
      api.DELETE('/api/prophecies/{id}/resolve', { params: { path: { id } } }),

    getAuditLogs: (id: string) =>
      api.GET('/api/prophecies/{id}/audit', { params: { path: { id } } }),
  },

  // ============================================================================
  // User (me)
  // ============================================================================
  user: {
    passwordLogin: {
      get: () => api.GET('/api/users/me/password-login'),
      toggle: (enabled: boolean) => api.PUT('/api/users/me/password-login', { body: { enabled } }),
    },

    avatar: {
      // Upload requires FormData, not supported by openapi-fetch directly
      upload: (file: File) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return fetch('/api/users/me/avatar', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        }).then(async (res) => ({
          data: res.ok ? ((await res.json()) as { avatarUrl: string }) : null,
          error: res.ok ? null : await res.json(),
          response: res,
        }));
      },
      delete: () => api.DELETE('/api/users/me/avatar'),
    },

    avatarSettings: {
      update: (data: RequestBody<'/api/users/me/avatar-settings', 'patch'>) =>
        api.PATCH('/api/users/me/avatar-settings', { body: data }),
    },

    preferences: {
      get: () =>
        fetch('/api/users/me/preferences', { credentials: 'include' }).then(async (res) => ({
          data: res.ok ? ((await res.json()) as { animationsEnabled: boolean }) : null,
          error: res.ok ? null : await res.json(),
          response: res,
        })),
      update: (data: { animationsEnabled?: boolean }) =>
        fetch('/api/users/me/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include',
        }).then(async (res) => ({
          data: res.ok
            ? ((await res.json()) as { success: boolean; animationsEnabled: boolean })
            : null,
          error: res.ok ? null : await res.json(),
          response: res,
        })),
    },

    passkeys: {
      list: () => api.GET('/api/users/me/passkeys'),
      // Passkey registration uses action-based POST which doesn't fit OpenAPI well
      getOptions: () =>
        fetch('/api/users/me/passkeys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'options' }),
          credentials: 'include',
        }).then(async (res) => ({
          data: res.ok ? ((await res.json()) as { options: unknown }) : null,
          error: res.ok ? null : await res.json(),
          response: res,
        })),
      verify: (credential: unknown, name?: string) =>
        fetch('/api/users/me/passkeys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', credential, name }),
          credentials: 'include',
        }).then(async (res) => ({
          data: res.ok
            ? ((await res.json()) as {
                success: boolean;
                passkey: { id: string; name: string; createdAt: string };
              })
            : null,
          error: res.ok ? null : await res.json(),
          response: res,
        })),
      rename: (id: string, name: string) =>
        api.PATCH('/api/users/me/passkeys', { body: { id, name } }),
      delete: (id: string) =>
        fetch(`/api/users/me/passkeys?id=${id}`, { method: 'DELETE', credentials: 'include' }).then(
          async (res) => ({
            data: res.ok ? await res.json() : null,
            error: res.ok ? null : await res.json(),
            response: res,
          })
        ),
    },
  },

  // ============================================================================
  // Badges
  // ============================================================================
  badges: {
    list: () =>
      fetch('/api/badges', { credentials: 'include' }).then(async (res) => ({
        data: res.ok ? await res.json() : null,
        error: res.ok ? null : await res.json(),
        response: res,
      })),

    awarded: () =>
      fetch('/api/badges/awarded', { credentials: 'include' }).then(async (res) => ({
        data: res.ok ? await res.json() : null,
        error: res.ok ? null : await res.json(),
        response: res,
      })),

    getHolders: (id: string) =>
      fetch(`/api/badges/${id}/holders`, { credentials: 'include' }).then(async (res) => ({
        data: res.ok ? await res.json() : null,
        error: res.ok ? null : await res.json(),
        response: res,
      })),
  },

  // ============================================================================
  // Users (public)
  // ============================================================================
  users: {
    list: () =>
      fetch('/api/users', { credentials: 'include' }).then(async (res) => ({
        data: res.ok ? await res.json() : null,
        error: res.ok ? null : await res.json(),
        response: res,
      })),

    get: (id: string) =>
      fetch(`/api/users/${id}`, { credentials: 'include' }).then(async (res) => ({
        data: res.ok ? await res.json() : null,
        error: res.ok ? null : await res.json(),
        response: res,
      })),

    getBadges: (id: string) =>
      fetch(`/api/users/${id}/badges`, { credentials: 'include' }).then(async (res) => ({
        data: res.ok ? await res.json() : null,
        error: res.ok ? null : await res.json(),
        response: res,
      })),
  },

  // ============================================================================
  // Admin
  // ============================================================================
  admin: {
    users: {
      list: () => api.GET('/api/admin/users'),

      get: (id: string) => api.GET('/api/admin/users/{id}', { params: { path: { id } } }),

      update: (id: string, data: RequestBody<'/api/admin/users/{id}', 'put'>) =>
        api.PUT('/api/admin/users/{id}', { params: { path: { id } }, body: data }),

      delete: (id: string) => api.DELETE('/api/admin/users/{id}', { params: { path: { id } } }),

      resetPassword: (id: string) =>
        api.POST('/api/admin/users/{id}/reset-password', { params: { path: { id } } }),
    },

    rounds: {
      triggerBotRatings: (id: string) =>
        api.POST('/api/admin/rounds/{id}/bot-ratings', { params: { path: { id } } }),
    },

    badges: {
      award: (userId: string, badgeKey: string) =>
        api.POST('/api/admin/badges/award', { body: { userId, badgeKey } }),

      revoke: (userId: string, badgeKey: string) =>
        api.DELETE('/api/admin/badges/award', { body: { userId, badgeKey } }),
    },
  },
};
