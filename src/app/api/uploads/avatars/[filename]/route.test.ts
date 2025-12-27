import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

describe('GET /api/uploads/avatars/[filename]', () => {
  describe('filename validation', () => {
    it('returns 400 for invalid filename format', async () => {
      const request = new NextRequest('http://localhost/api/uploads/avatars/invalid.webp');

      const response = await GET(request, {
        params: Promise.resolve({ filename: 'invalid.webp' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Ungültiger Dateiname');
    });

    it('returns 400 for filename without .webp extension', async () => {
      const request = new NextRequest('http://localhost/api/uploads/avatars/test.png');

      const response = await GET(request, {
        params: Promise.resolve({ filename: 'a'.repeat(64) + '.png' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Ungültiger Dateiname');
    });

    it('returns 400 for filename with non-hex characters', async () => {
      const request = new NextRequest('http://localhost/api/uploads/avatars/test.webp');

      const response = await GET(request, {
        params: Promise.resolve({ filename: 'g'.repeat(64) + '.webp' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Ungültiger Dateiname');
    });

    it('returns 400 for filename with wrong hash length (too short)', async () => {
      const request = new NextRequest('http://localhost/api/uploads/avatars/test.webp');

      const response = await GET(request, {
        params: Promise.resolve({ filename: 'a'.repeat(32) + '.webp' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Ungültiger Dateiname');
    });

    it('returns 400 for filename with wrong hash length (too long)', async () => {
      const request = new NextRequest('http://localhost/api/uploads/avatars/test.webp');

      const response = await GET(request, {
        params: Promise.resolve({ filename: 'a'.repeat(128) + '.webp' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Ungültiger Dateiname');
    });

    it('returns 400 for empty filename', async () => {
      const request = new NextRequest('http://localhost/api/uploads/avatars/');

      const response = await GET(request, {
        params: Promise.resolve({ filename: '' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Ungültiger Dateiname');
    });

    it('returns 400 for filename with path traversal attempt', async () => {
      const request = new NextRequest('http://localhost/api/uploads/avatars/../etc/passwd');

      const response = await GET(request, {
        params: Promise.resolve({ filename: '../etc/passwd' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Ungültiger Dateiname');
    });

    it('returns 400 for uppercase hex characters', async () => {
      const request = new NextRequest('http://localhost/api/uploads/avatars/test.webp');

      // Uppercase A-F should be rejected (only lowercase a-f allowed)
      const response = await GET(request, {
        params: Promise.resolve({ filename: 'A'.repeat(64) + '.webp' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Ungültiger Dateiname');
    });
  });

  describe('valid filename format', () => {
    it('accepts valid SHA-256 hash format with lowercase hex', async () => {
      // Valid SHA-256 hashes are 64 lowercase hex characters
      const validHashes = [
        'a'.repeat(64),
        'f'.repeat(64),
        '0'.repeat(64),
        'abc123def456'.padEnd(64, '0'),
        '0123456789abcdef'.repeat(4),
      ];

      for (const hash of validHashes) {
        const filename = hash + '.webp';
        const request = new NextRequest('http://localhost/api/uploads/avatars/' + filename);

        const response = await GET(request, {
          params: Promise.resolve({ filename }),
        });

        // Should not return 400 (validation passed)
        // May return 404 if file doesn't exist, which is expected
        expect(response.status).not.toBe(400);
      }
    });
  });
});
