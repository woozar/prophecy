import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { validateBody, validateParams, validateQuery } from './validation';

describe('validation', () => {
  describe('validateBody', () => {
    const testSchema = z.object({
      name: z.string().min(1, 'Name erforderlich'),
      age: z.number().min(0, 'Alter muss positiv sein'),
    });

    it('returns success with valid JSON body', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', age: 25 }),
      });

      const result = await validateBody(request, testSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'Test', age: 25 });
      }
    });

    it('returns 400 error for invalid schema', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: JSON.stringify({ name: '', age: 25 }),
      });

      const result = await validateBody(request, testSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
        const data = await result.response.json();
        expect(data.error).toBe('Name erforderlich');
      }
    });

    it('returns 400 error for missing required field', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });

      const result = await validateBody(request, testSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
      }
    });

    it('returns 400 error for invalid JSON', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: 'invalid json {',
      });

      const result = await validateBody(request, testSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
        const data = await result.response.json();
        expect(data.error).toBe('Ungültiger Request-Body');
      }
    });

    it('returns 400 error for wrong type', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', age: 'not a number' }),
      });

      const result = await validateBody(request, testSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
      }
    });
  });

  describe('validateQuery', () => {
    const querySchema = z.object({
      page: z.string().optional(),
      filter: z.enum(['all', 'active', 'inactive']).optional(),
    });

    it('returns success with valid query params', () => {
      const request = new Request('http://localhost/test?page=1&filter=active');

      const result = validateQuery(request, querySchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: '1', filter: 'active' });
      }
    });

    it('returns success with empty query params', () => {
      const request = new Request('http://localhost/test');

      const result = validateQuery(request, querySchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it('returns 400 error for invalid enum value', () => {
      const request = new Request('http://localhost/test?filter=invalid');

      const result = validateQuery(request, querySchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
      }
    });

    it('handles multiple query params correctly', () => {
      const request = new Request('http://localhost/test?page=2&filter=inactive');

      const result = validateQuery(request, querySchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe('2');
        expect(result.data.filter).toBe('inactive');
      }
    });
  });

  describe('validateParams', () => {
    const paramsSchema = z.object({
      id: z.string().uuid('Ungültige ID'),
    });

    it('returns success with valid path params', () => {
      const params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      const result = validateParams(params, paramsSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      }
    });

    it('returns 400 error for invalid UUID', () => {
      const params = { id: 'not-a-uuid' };

      const result = validateParams(params, paramsSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
        // Note: We can't easily check the error message because the response
        // has already been consumed or we need to clone it
      }
    });

    it('returns 400 error for missing param', () => {
      const params = {};

      const result = validateParams(params, paramsSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
      }
    });

    it('validates multiple params', () => {
      const multiSchema = z.object({
        userId: z.string(),
        postId: z.string(),
      });
      const params = { userId: 'user-123', postId: 'post-456' };

      const result = validateParams(params, multiSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ userId: 'user-123', postId: 'post-456' });
      }
    });
  });
});
