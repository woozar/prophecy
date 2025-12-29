export interface CreatorStats {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalProphecies: number;
  acceptedProphecies: number; // averageRating > 0
  acceptedPercentage: number;
  fulfilledProphecies: number; // nur von accepted
  fulfilledPercentage: number;
  totalScore: number; // Summe averageRating der erfüllten
  maxPossibleScore: number; // Summe averageRating aller akzeptierten
  scorePercentage: number; // totalScore / maxPossibleScore * 100
}

export interface RaterStats {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalRatings: number;
  correctPoints: number; // Summe |rating| für korrekte
  incorrectPoints: number; // Summe |rating| für inkorrekte
  netScore: number; // correct - incorrect
  maxPossibleScore: number; // Summe aller |rating|
  hitRatePercentage: number; // netScore / maxPossible * 100
}

export interface RoundStatistics {
  roundId: string;
  creatorStats: CreatorStats[];
  raterStats: RaterStats[];
  totalAcceptedProphecies: number;
  resolvedProphecies: number;
  isComplete: boolean;
}
