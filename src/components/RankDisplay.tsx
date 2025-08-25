import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Trophy } from 'lucide-react'
import { getRankByPoints, getNextRank, getRankProgress, getPointsToNextRank } from '@/lib/ranks'

interface RankDisplayProps {
  totalPoints: number
  currentPoints: number
}

export function RankDisplay({ totalPoints, currentPoints }: RankDisplayProps) {
  const currentRank = getRankByPoints(totalPoints)
  const nextRank = getNextRank(totalPoints)
  const progress = getRankProgress(totalPoints)
  const pointsToNext = getPointsToNextRank(totalPoints)

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Current Rank Display */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 p-3 rounded-full bg-primary/10">
              <currentRank.icon className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading font-semibold text-lg text-primary">
                  {currentRank.name}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {totalPoints.toLocaleString()} Punkte
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentRank.description}
              </p>
            </div>
          </div>

          {/* Progress to Next Rank */}
          {nextRank && progress && pointsToNext && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Nächster Rang: {nextRank.name}
                </span>
                <span className="font-medium text-primary">
                  {pointsToNext.toLocaleString()} Punkte fehlen
                </span>
              </div>
              
              <Progress 
                value={progress.percentage} 
                className="h-2"
              />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progress.current.toLocaleString()} / {progress.total.toLocaleString()}</span>
                <span>{Math.round(progress.percentage)}% erreicht</span>
              </div>
            </div>
          )}

          {/* Max Rank Achieved */}
          {!nextRank && (
            <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
              <Trophy className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-primary">
                Höchster Rang erreicht!
              </p>
              <p className="text-xs text-muted-foreground">
                Sie sind eine wahre Eggenthal-Legende!
              </p>
            </div>
          )}

          {/* Available Points */}
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Verfügbare Punkte für Belohnungen:
              </span>
              <span className="text-lg font-bold text-primary">
                {currentPoints.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}