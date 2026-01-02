import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cleanupExpiredChallenges,
  clearChallenge,
  getChallenge,
  storeChallenge,
  webauthnConfig,
} from './webauthn';

describe('webauthn', () => {
  describe('webauthnConfig', () => {
    it('has correct default values', () => {
      expect(webauthnConfig.rpName).toBe('Prophezeiung');
      expect(webauthnConfig.timeout).toBe(60000);
      expect(webauthnConfig.authenticatorSelection.residentKey).toBe('preferred');
      expect(webauthnConfig.authenticatorSelection.userVerification).toBe('preferred');
      expect(webauthnConfig.supportedAlgorithmIDs).toContain(-7); // ES256
      expect(webauthnConfig.supportedAlgorithmIDs).toContain(-257); // RS256
    });

    it('has rpID and origin defined', () => {
      expect(webauthnConfig.rpID).toBeDefined();
      expect(typeof webauthnConfig.rpID).toBe('string');
      expect(webauthnConfig.origin).toBeDefined();
      expect(typeof webauthnConfig.origin).toBe('string');
    });
  });

  describe('challenge store', () => {
    // Use unique user IDs per test to avoid collisions with singleton store
    let testUserId: number;

    beforeEach(() => {
      testUserId = Date.now() + Math.random();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const getUniqueUserId = (suffix: string) => `test-user-${testUserId}-${suffix}`;

    describe('storeChallenge', () => {
      it('stores challenge for a user', () => {
        const userId = getUniqueUserId('store1');
        storeChallenge(userId, 'challenge-123');

        const result = getChallenge(userId);
        expect(result).toBe('challenge-123');

        // Cleanup
        clearChallenge(userId);
      });

      it('overwrites existing challenge for same user', () => {
        const userId = getUniqueUserId('store2');
        storeChallenge(userId, 'challenge-old');
        storeChallenge(userId, 'challenge-new');

        const result = getChallenge(userId);
        expect(result).toBe('challenge-new');

        // Cleanup
        clearChallenge(userId);
      });

      it('stores challenges for different users independently', () => {
        const userId1 = getUniqueUserId('store3a');
        const userId2 = getUniqueUserId('store3b');

        storeChallenge(userId1, 'challenge-1');
        storeChallenge(userId2, 'challenge-2');

        expect(getChallenge(userId1)).toBe('challenge-1');
        expect(getChallenge(userId2)).toBe('challenge-2');

        // Cleanup
        clearChallenge(userId1);
        clearChallenge(userId2);
      });
    });

    describe('getChallenge', () => {
      it('returns stored challenge', () => {
        const userId = getUniqueUserId('get1');
        storeChallenge(userId, 'my-challenge');

        const result = getChallenge(userId);
        expect(result).toBe('my-challenge');

        // Cleanup
        clearChallenge(userId);
      });

      it('returns null for non-existent user', () => {
        const result = getChallenge('non-existent-user-xyz');
        expect(result).toBeNull();
      });

      it('returns null for expired challenge', () => {
        vi.useFakeTimers();
        const userId = getUniqueUserId('get2');

        storeChallenge(userId, 'expiring-challenge');

        // Fast-forward 6 minutes (challenge expires after 5 minutes)
        vi.advanceTimersByTime(6 * 60 * 1000);

        const result = getChallenge(userId);
        expect(result).toBeNull();
      });

      it('returns challenge if not yet expired', () => {
        vi.useFakeTimers();
        const userId = getUniqueUserId('get3');

        storeChallenge(userId, 'valid-challenge');

        // Fast-forward 4 minutes (less than 5 minute expiry)
        vi.advanceTimersByTime(4 * 60 * 1000);

        const result = getChallenge(userId);
        expect(result).toBe('valid-challenge');
      });

      it('deletes expired challenge when accessed', () => {
        vi.useFakeTimers();
        const userId = getUniqueUserId('get4');

        storeChallenge(userId, 'expiring-challenge');

        // Fast-forward past expiry
        vi.advanceTimersByTime(6 * 60 * 1000);

        // First access returns null and deletes
        getChallenge(userId);

        // Subsequent access also returns null
        const result = getChallenge(userId);
        expect(result).toBeNull();
      });
    });

    describe('clearChallenge', () => {
      it('removes challenge for user', () => {
        const userId = getUniqueUserId('clear1');
        storeChallenge(userId, 'challenge-to-clear');

        clearChallenge(userId);

        const result = getChallenge(userId);
        expect(result).toBeNull();
      });

      it('does not affect other users', () => {
        const userId1 = getUniqueUserId('clear2a');
        const userId2 = getUniqueUserId('clear2b');

        storeChallenge(userId1, 'challenge-1');
        storeChallenge(userId2, 'challenge-2');

        clearChallenge(userId1);

        expect(getChallenge(userId1)).toBeNull();
        expect(getChallenge(userId2)).toBe('challenge-2');

        // Cleanup
        clearChallenge(userId2);
      });

      it('handles clearing non-existent challenge', () => {
        // Should not throw
        expect(() => clearChallenge('non-existent')).not.toThrow();
      });
    });

    describe('cleanupExpiredChallenges', () => {
      it('removes all expired challenges', () => {
        vi.useFakeTimers();
        const userId1 = getUniqueUserId('cleanup1');
        const userId2 = getUniqueUserId('cleanup2');
        const userId3 = getUniqueUserId('cleanup3');

        storeChallenge(userId1, 'challenge-1');
        storeChallenge(userId2, 'challenge-2');

        // Fast-forward past expiry
        vi.advanceTimersByTime(6 * 60 * 1000);

        // Add a fresh challenge
        storeChallenge(userId3, 'challenge-3');

        cleanupExpiredChallenges();

        expect(getChallenge(userId1)).toBeNull();
        expect(getChallenge(userId2)).toBeNull();
        expect(getChallenge(userId3)).toBe('challenge-3');

        clearChallenge(userId3);
      });

      it('keeps non-expired challenges', () => {
        vi.useFakeTimers();
        const userId = getUniqueUserId('cleanup4');

        storeChallenge(userId, 'valid-challenge');

        // Fast-forward 2 minutes (less than expiry)
        vi.advanceTimersByTime(2 * 60 * 1000);

        cleanupExpiredChallenges();

        expect(getChallenge(userId)).toBe('valid-challenge');

        clearChallenge(userId);
      });

      it('handles empty store', () => {
        // Should not throw
        expect(() => cleanupExpiredChallenges()).not.toThrow();
      });
    });
  });
});
