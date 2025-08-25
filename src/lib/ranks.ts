export interface CustomerRank {
  name: string;
  emoji: string;
  minPoints: number;
  maxPoints: number;
}

export const RANKS: CustomerRank[] = [
  {
    name: "Dorfladen-Neuling",
    emoji: "🥔",
    minPoints: 0,
    maxPoints: 499
  },
  {
    name: "Stammkunde von Eggenthal", 
    emoji: "🥖",
    minPoints: 500,
    maxPoints: 2999
  },
  {
    name: "Schnäppchenjäger",
    emoji: "🧅", 
    minPoints: 3000,
    maxPoints: 4999
  },
  {
    name: "Regalräuber",
    emoji: "🧀",
    minPoints: 5000,
    maxPoints: 9999
  },
  {
    name: "Eggenthal-Legende",
    emoji: "🐄",
    minPoints: 10000,
    maxPoints: Infinity
  }
];

export function getRankByPoints(totalPoints: number): CustomerRank {
  return RANKS.find(rank => 
    totalPoints >= rank.minPoints && totalPoints <= rank.maxPoints
  ) || RANKS[0];
}

export function getPointsToNextRank(totalPoints: number): number | null {
  const currentRank = getRankByPoints(totalPoints);
  const currentRankIndex = RANKS.findIndex(rank => rank === currentRank);
  
  // If already at highest rank, return null
  if (currentRankIndex === RANKS.length - 1) {
    return null;
  }
  
  const nextRank = RANKS[currentRankIndex + 1];
  return nextRank.minPoints - totalPoints;
}