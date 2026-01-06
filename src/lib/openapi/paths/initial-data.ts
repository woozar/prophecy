import { z } from 'zod';

import { errorResponseSchema, roleSchema, userStatusSchema } from '@/lib/schemas/common';
import { prophecyResponseSchema } from '@/lib/schemas/prophecy';
import { ratingResponseSchema } from '@/lib/schemas/rating';
import { roundResponseSchema } from '@/lib/schemas/round';

import { registry } from '../registry';

// ============================================================================
// Initial Data Schemas
// ============================================================================

// Badge enums
const badgeCategorySchema = z
  .enum([
    'CREATOR',
    'ACCURACY',
    'RATER',
    'RATER_ACC',
    'ROUNDS',
    'LEADERBOARD',
    'SPECIAL',
    'SOCIAL',
    'HIDDEN',
  ])
  .openapi('BadgeCategory');

const badgeRaritySchema = z.enum(['BRONZE', 'SILVER', 'GOLD', 'LEGENDARY']).openapi('BadgeRarity');

// Badge schema
const badgeSchema = z
  .object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    description: z.string(),
    requirement: z.string(),
    icon: z.string(),
    category: badgeCategorySchema,
    rarity: badgeRaritySchema,
    threshold: z.number().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi('Badge');

// UserBadge schema (with full badge data)
const userBadgeSchema = z
  .object({
    id: z.string(),
    badgeId: z.string(),
    userId: z.string(),
    earnedAt: z.string().datetime(),
    badge: badgeSchema,
  })
  .openapi('UserBadge');

// UserBadgeSimple schema (without full badge data)
const userBadgeSimpleSchema = z
  .object({
    userId: z.string(),
    badgeId: z.string(),
    earnedAt: z.string().datetime(),
  })
  .openapi('UserBadgeSimple');

// User schema with isBot field (specific to initial-data)
const initialDataUserSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    avatarEffect: z.string().nullable(),
    avatarEffectColors: z.array(z.string()),
    role: roleSchema,
    status: userStatusSchema,
    isBot: z.boolean(),
    createdAt: z.string().datetime(),
    badgeIds: z.array(z.string()),
  })
  .openapi('InitialDataUser');

const initialDataResponseSchema = z
  .object({
    users: z.array(initialDataUserSchema),
    rounds: z.array(roundResponseSchema),
    prophecies: z.array(prophecyResponseSchema),
    ratings: z.array(ratingResponseSchema),
    badges: z.array(badgeSchema),
    myBadges: z.array(userBadgeSchema),
    allUserBadges: z.array(userBadgeSimpleSchema),
    currentUserId: z.string(),
  })
  .openapi('InitialDataResponse');

// ============================================================================
// Get Initial Data
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/initial-data',
  tags: ['Data'],
  summary: 'Get all initial data for store hydration',
  responses: {
    200: {
      description: 'Initial data for store',
      content: { 'application/json': { schema: initialDataResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});
