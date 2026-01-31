import { Prophecy, Round } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

import { Errors } from './errors';

export type ProphecyWithRound = Prophecy & { round: Round };

interface AccessCheckOptions {
  /** Check if user is the owner (default: true) */
  requireOwner?: boolean;
  /** Check if submission deadline hasn't passed (default: true) */
  checkDeadline?: boolean;
  /** Custom error message when deadline passed */
  deadlineErrorMessage?: string;
  /** Check if prophecy has been resolved (fulfilled !== null) */
  checkResolved?: boolean;
}

/**
 * Get prophecy and validate access permissions.
 * Throws ApiError if validation fails.
 *
 * @throws {ApiError} 404 if prophecy not found
 * @throws {ApiError} 403 if user doesn't own prophecy (when requireOwner=true)
 * @throws {ApiError} 400 if submission deadline passed (when checkDeadline=true)
 */
export async function getProphecyWithAccessCheck(
  id: string,
  userId: string,
  options: AccessCheckOptions = {}
): Promise<ProphecyWithRound> {
  const {
    requireOwner = true,
    checkDeadline = true,
    checkResolved = false,
    deadlineErrorMessage = 'Einreichungsfrist ist abgelaufen',
  } = options;

  const prophecy = await prisma.prophecy.findUnique({
    where: { id },
    include: { round: true },
  });

  if (!prophecy) {
    throw Errors.notFound('Prophezeiung');
  }

  if (requireOwner && prophecy.creatorId !== userId) {
    throw Errors.forbidden();
  }

  if (checkResolved && prophecy.fulfilled !== null) {
    throw Errors.badRequest('Aufgelöste Prophezeiungen können nicht mehr bearbeitet werden');
  }

  if (checkDeadline && new Date() > prophecy.round.submissionDeadline) {
    throw Errors.badRequest(deadlineErrorMessage);
  }

  return prophecy;
}
