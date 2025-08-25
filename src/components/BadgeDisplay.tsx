import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Award, Calendar, Lock } from 'lucide-react'

interface BadgeData {
  id: string
  name: string
  description: string
  icon: string
  condition_type: string
  condition_value: number
  active: boolean
  unlocked_at?: string
}

interface BadgeDisplayProps {
  badges: BadgeData[]
  unlockedBadges: string[]
}

const getIconForBadge = (icon: string) => {
  switch (icon) {
    case 'award':
      return <Award className="w-6 h-6" />
    case 'calendar':
      return <Calendar className="w-6 h-6" />
    default:
      return <Award className="w-6 h-6" />
  }
}

export function BadgeDisplay({ badges, unlockedBadges }: BadgeDisplayProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {badges.map((badge) => {
          const isUnlocked = unlockedBadges.includes(badge.id)
          const unlockedBadge = unlockedBadges.find(ub => ub === badge.id)
          
          return (
            <Card 
              key={badge.id} 
              className={`transition-all duration-200 ${
                isUnlocked 
                  ? 'border-primary/50 bg-primary/5 hover:bg-primary/10' 
                  : 'border-muted-foreground/20 bg-muted/20 opacity-60'
              }`}
            >
              <CardHeader className="text-center pb-3">
                <div 
                  className={`mx-auto p-3 rounded-full ${
                    isUnlocked 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isUnlocked ? getIconForBadge(badge.icon) : <Lock className="w-6 h-6" />}
                </div>
                <CardTitle className={`text-lg ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {badge.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <CardDescription className="text-sm">
                  {badge.description}
                </CardDescription>
                
                <div className="space-y-2">
                  <Badge 
                    variant={isUnlocked ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {isUnlocked ? "Freigeschaltet" : "Gesperrt"}
                  </Badge>
                  
                  {isUnlocked && unlockedBadge && (
                    <p className="text-xs text-muted-foreground">
                      Erhalten am {formatDate(unlockedBadge)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {badges.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <Award className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Noch keine Abzeichen verfügbar</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}