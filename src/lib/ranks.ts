import { LucideIcon, Sprout, Sandwich, ShoppingBag, UtensilsCrossed, Trophy } from 'lucide-react'

export interface CustomerRank {
  name: string;
  emoji: string;
  icon: LucideIcon;
  description: string;
  minPoints: number;
  maxPoints: number;
}

export const RANKS: CustomerRank[] = [
  {
    name: "Dorfladen-Neuling",
    emoji: "🥔",
    icon: Sprout,
    description: "Frisch dabei! Entdecken Sie unser Sortiment.",
    minPoints: 0,
    maxPoints: 499
  },
  {
    name: "Stammkunde von Eggenthal", 
    emoji: "🥖",
    icon: Sandwich,
    description: "Ein treuer Kunde! Sie kennen sich schon aus.",
    minPoints: 500,
    maxPoints: 2999
  },
  {
    name: "Schnäppchenjäger",
    emoji: "🧅", 
    icon: ShoppingBag,
    description: "Sie finden die besten Angebote im Dorfladen.",
    minPoints: 3000,
    maxPoints: 4999
  },
  {
    name: "Regalräuber",
    emoji: "🧀",
    icon: UtensilsCrossed,
    description: "Ein wahrer Kenner unserer Spezialitäten!",
    minPoints: 5000,
    maxPoints: 9999
  },
  {
    name: "Eggenthal-Legende",
    emoji: "🐄",
    icon: Trophy,
    description: "Eine wahre Legende! Unser wertvollster Kunde.",
    minPoints: 10000,
    maxPoints: Infinity
  }
];

export function getRankByPoints(totalPoints: number): CustomerRank {
  return RANKS.find(rank => 
    totalPoints >= rank.minPoints && totalPoints <= rank.maxPoints
  ) || RANKS[0];
}

export function getNextRank(totalPoints: number): CustomerRank | null {
  const currentRank = getRankByPoints(totalPoints);
  const currentRankIndex = RANKS.findIndex(rank => rank === currentRank);
  
  // If already at highest rank, return null
  if (currentRankIndex === RANKS.length - 1) {
    return null;
  }
  
  return RANKS[currentRankIndex + 1];
}

export function getRankProgress(totalPoints: number): { current: number; total: number; percentage: number } | null {
  const currentRank = getRankByPoints(totalPoints);
  const nextRank = getNextRank(totalPoints);
  
  if (!nextRank) {
    return null; // Already at max rank
  }
  
  const current = totalPoints - currentRank.minPoints;
  const total = nextRank.minPoints - currentRank.minPoints;
  const percentage = Math.min((current / total) * 100, 100);
  
  return { current, total, percentage };
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