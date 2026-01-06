import { BadgeCategory, BadgeRarity } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  type AwardedBadge,
  type Badge,
  type UserBadge,
  type UserBadgeSimple,
  selectAllBadges,
  selectAwardedBadges,
  selectAwardedBadgesByCategory,
  selectBadgeById,
  selectHasBadge,
  selectMyBadgeIds,
  selectMyBadges,
  selectMyBadgesByCategory,
  selectUserBadges,
  useBadgeStore,
} from './useBadgeStore';

const createMockBadge = (overrides = {}): Badge => ({
  id: 'badge-1',
  key: 'creator_1',
  name: 'Anfänger-Seher',
  description: 'Erste Schritte',
  requirement: '1 Prophezeiung erstellt',
  category: BadgeCategory.CREATOR,
  rarity: BadgeRarity.BRONZE,
  threshold: 1,
  createdAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const createMockUserBadge = (overrides = {}): UserBadge => ({
  id: 'ub-1',
  badgeId: 'badge-1',
  userId: 'user-1',
  earnedAt: '2025-01-05T00:00:00.000Z',
  badge: createMockBadge(),
  ...overrides,
});

const createMockAwardedBadge = (overrides = {}): AwardedBadge => ({
  ...createMockBadge(),
  firstAchiever: {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: null,
    avatarEffect: null,
    avatarEffectColors: [],
  },
  firstAchievedAt: '2025-01-05T00:00:00.000Z',
  totalAchievers: 3,
  ...overrides,
});

describe('useBadgeStore', () => {
  beforeEach(() => {
    useBadgeStore.setState({
      badges: {},
      myBadges: {},
      allUserBadges: {},
      awardedBadges: [],
      isInitialized: false,
      isLoading: false,
      error: null,
    });
  });

  describe('setBadges', () => {
    it('sets badges as record keyed by id', () => {
      const badges = [createMockBadge(), createMockBadge({ id: 'badge-2', key: 'creator_5' })];
      useBadgeStore.getState().setBadges(badges);

      const state = useBadgeStore.getState();
      expect(Object.keys(state.badges)).toHaveLength(2);
      expect(state.badges['badge-1'].key).toBe('creator_1');
      expect(state.badges['badge-2'].key).toBe('creator_5');
    });
  });

  describe('setMyBadges', () => {
    it('sets user badges as record keyed by badgeId', () => {
      const userBadges = [
        createMockUserBadge(),
        createMockUserBadge({ id: 'ub-2', badgeId: 'badge-2' }),
      ];
      useBadgeStore.getState().setMyBadges(userBadges);

      const state = useBadgeStore.getState();
      expect(Object.keys(state.myBadges)).toHaveLength(2);
      expect(state.myBadges['badge-1'].id).toBe('ub-1');
      expect(state.myBadges['badge-2'].id).toBe('ub-2');
    });
  });

  describe('addMyBadge', () => {
    it('adds new badge to existing badges', () => {
      useBadgeStore.getState().setMyBadges([createMockUserBadge()]);
      useBadgeStore.getState().addMyBadge(createMockUserBadge({ id: 'ub-2', badgeId: 'badge-2' }));

      const state = useBadgeStore.getState();
      expect(Object.keys(state.myBadges)).toHaveLength(2);
    });

    it('overwrites existing badge with same badgeId', () => {
      useBadgeStore.getState().setMyBadges([createMockUserBadge()]);
      useBadgeStore.getState().addMyBadge(createMockUserBadge({ id: 'ub-updated' }));

      const state = useBadgeStore.getState();
      expect(Object.keys(state.myBadges)).toHaveLength(1);
      expect(state.myBadges['badge-1'].id).toBe('ub-updated');
    });
  });

  describe('removeMyBadge', () => {
    it('removes badge from myBadges', () => {
      useBadgeStore
        .getState()
        .setMyBadges([
          createMockUserBadge(),
          createMockUserBadge({ id: 'ub-2', badgeId: 'badge-2' }),
        ]);
      useBadgeStore.getState().removeMyBadge('badge-1');

      const state = useBadgeStore.getState();
      expect(Object.keys(state.myBadges)).toHaveLength(1);
      expect(state.myBadges['badge-1']).toBeUndefined();
      expect(state.myBadges['badge-2']).toBeDefined();
    });

    it('does nothing when removing non-existent badge', () => {
      useBadgeStore.getState().setMyBadges([createMockUserBadge()]);
      useBadgeStore.getState().removeMyBadge('nonexistent');

      const state = useBadgeStore.getState();
      expect(Object.keys(state.myBadges)).toHaveLength(1);
    });
  });

  describe('setAllUserBadges', () => {
    it('groups user badges by userId and badgeId', () => {
      const userBadges: UserBadgeSimple[] = [
        { userId: 'user-1', badgeId: 'badge-1', earnedAt: '2025-01-05T00:00:00.000Z' },
        { userId: 'user-1', badgeId: 'badge-2', earnedAt: '2025-01-06T00:00:00.000Z' },
        { userId: 'user-2', badgeId: 'badge-1', earnedAt: '2025-01-07T00:00:00.000Z' },
      ];
      useBadgeStore.getState().setAllUserBadges(userBadges);

      const state = useBadgeStore.getState();
      expect(Object.keys(state.allUserBadges)).toHaveLength(2);
      expect(Object.keys(state.allUserBadges['user-1'])).toHaveLength(2);
      expect(Object.keys(state.allUserBadges['user-2'])).toHaveLength(1);
    });
  });

  describe('addUserBadge', () => {
    it('adds badge to existing user', () => {
      useBadgeStore
        .getState()
        .setAllUserBadges([
          { userId: 'user-1', badgeId: 'badge-1', earnedAt: '2025-01-05T00:00:00.000Z' },
        ]);
      useBadgeStore.getState().addUserBadge({
        userId: 'user-1',
        badgeId: 'badge-2',
        earnedAt: '2025-01-06T00:00:00.000Z',
      });

      const state = useBadgeStore.getState();
      expect(Object.keys(state.allUserBadges['user-1'])).toHaveLength(2);
    });

    it('creates new user entry if not exists', () => {
      useBadgeStore.getState().addUserBadge({
        userId: 'user-new',
        badgeId: 'badge-1',
        earnedAt: '2025-01-05T00:00:00.000Z',
      });

      const state = useBadgeStore.getState();
      expect(state.allUserBadges['user-new']).toBeDefined();
      expect(state.allUserBadges['user-new']['badge-1']).toBeDefined();
    });
  });

  describe('removeUserBadge', () => {
    it('removes badge from specific user', () => {
      useBadgeStore.getState().setAllUserBadges([
        { userId: 'user-1', badgeId: 'badge-1', earnedAt: '2025-01-05T00:00:00.000Z' },
        { userId: 'user-1', badgeId: 'badge-2', earnedAt: '2025-01-06T00:00:00.000Z' },
      ]);
      useBadgeStore.getState().removeUserBadge('user-1', 'badge-1');

      const state = useBadgeStore.getState();
      expect(Object.keys(state.allUserBadges['user-1'])).toHaveLength(1);
      expect(state.allUserBadges['user-1']['badge-1']).toBeUndefined();
      expect(state.allUserBadges['user-1']['badge-2']).toBeDefined();
    });

    it('does nothing when user does not exist', () => {
      useBadgeStore
        .getState()
        .setAllUserBadges([
          { userId: 'user-1', badgeId: 'badge-1', earnedAt: '2025-01-05T00:00:00.000Z' },
        ]);
      useBadgeStore.getState().removeUserBadge('nonexistent', 'badge-1');

      const state = useBadgeStore.getState();
      expect(Object.keys(state.allUserBadges)).toHaveLength(1);
    });

    it('does nothing when badge does not exist for user', () => {
      useBadgeStore
        .getState()
        .setAllUserBadges([
          { userId: 'user-1', badgeId: 'badge-1', earnedAt: '2025-01-05T00:00:00.000Z' },
        ]);
      useBadgeStore.getState().removeUserBadge('user-1', 'nonexistent');

      const state = useBadgeStore.getState();
      expect(Object.keys(state.allUserBadges['user-1'])).toHaveLength(1);
    });
  });

  describe('setAwardedBadges', () => {
    it('sets awarded badges array', () => {
      const awardedBadges = [createMockAwardedBadge()];
      useBadgeStore.getState().setAwardedBadges(awardedBadges);

      const state = useBadgeStore.getState();
      expect(state.awardedBadges).toHaveLength(1);
      expect(state.awardedBadges[0].totalAchievers).toBe(3);
    });
  });

  describe('state setters', () => {
    it('setInitialized updates isInitialized', () => {
      useBadgeStore.getState().setInitialized(true);
      expect(useBadgeStore.getState().isInitialized).toBe(true);
    });

    it('setLoading updates isLoading', () => {
      useBadgeStore.getState().setLoading(true);
      expect(useBadgeStore.getState().isLoading).toBe(true);
    });

    it('setError updates error', () => {
      useBadgeStore.getState().setError('Test error');
      expect(useBadgeStore.getState().error).toBe('Test error');
    });
  });
});

describe('useBadgeStore selectors', () => {
  beforeEach(() => {
    useBadgeStore.setState({
      badges: {
        'badge-1': createMockBadge(),
        'badge-2': createMockBadge({ id: 'badge-2', key: 'rater_10', category: 'RATER' }),
      },
      myBadges: {
        'badge-1': createMockUserBadge(),
      },
      allUserBadges: {
        'user-1': {
          'badge-1': { userId: 'user-1', badgeId: 'badge-1', earnedAt: '2025-01-05T00:00:00.000Z' },
        },
        'user-2': {
          'badge-1': { userId: 'user-2', badgeId: 'badge-1', earnedAt: '2025-01-06T00:00:00.000Z' },
          'badge-2': { userId: 'user-2', badgeId: 'badge-2', earnedAt: '2025-01-07T00:00:00.000Z' },
        },
      },
      awardedBadges: [
        createMockAwardedBadge(),
        createMockAwardedBadge({ id: 'badge-2', category: 'RATER' }),
      ],
      isInitialized: true,
      isLoading: false,
      error: null,
    });
  });

  it('selectBadgeById returns badge by id', () => {
    const state = useBadgeStore.getState();
    expect(selectBadgeById('badge-1')(state)?.key).toBe('creator_1');
    expect(selectBadgeById('nonexistent')(state)).toBeUndefined();
  });

  it('selectAllBadges returns all badges as array', () => {
    const state = useBadgeStore.getState();
    expect(selectAllBadges(state)).toHaveLength(2);
  });

  it('selectMyBadges returns user badges as array', () => {
    const state = useBadgeStore.getState();
    expect(selectMyBadges(state)).toHaveLength(1);
  });

  it('selectMyBadgeIds returns badge ids', () => {
    const state = useBadgeStore.getState();
    expect(selectMyBadgeIds(state)).toEqual(['badge-1']);
  });

  it('selectHasBadge checks if user has badge', () => {
    const state = useBadgeStore.getState();
    expect(selectHasBadge('badge-1')(state)).toBe(true);
    expect(selectHasBadge('badge-2')(state)).toBe(false);
  });

  it('selectAwardedBadges returns awarded badges', () => {
    const state = useBadgeStore.getState();
    expect(selectAwardedBadges(state)).toHaveLength(2);
  });

  it('selectUserBadges returns badges for specific user', () => {
    const state = useBadgeStore.getState();
    expect(selectUserBadges('user-1')(state)).toHaveLength(1);
    expect(selectUserBadges('user-2')(state)).toHaveLength(2);
    expect(selectUserBadges('nonexistent')(state)).toEqual([]);
  });

  it('selectMyBadgesByCategory filters by category', () => {
    const state = useBadgeStore.getState();
    expect(selectMyBadgesByCategory('CREATOR')(state)).toHaveLength(1);
    expect(selectMyBadgesByCategory('RATER')(state)).toHaveLength(0);
  });

  it('selectAwardedBadgesByCategory filters awarded badges by category', () => {
    const state = useBadgeStore.getState();
    expect(selectAwardedBadgesByCategory('CREATOR')(state)).toHaveLength(1);
    expect(selectAwardedBadgesByCategory('RATER')(state)).toHaveLength(1);
  });
});
