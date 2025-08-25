import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Gift, Star, Lock } from 'lucide-react'

// Import reward images
import discount10 from '@/assets/rewards/discount-10.jpg'
import freeCoffee from '@/assets/rewards/free-coffee.jpg'
import freeBread from '@/assets/rewards/free-bread.jpg'
import surpriseGift from '@/assets/rewards/surprise-gift.jpg'

interface Reward {
  id: string
  name: string
  points_required: number
  description: string
  active: boolean
}

interface RewardCardProps {
  reward: Reward
  currentPoints: number
  onRedeem: (reward: Reward) => void
}

// Map reward names to images (you can extend this)
const getRewardImage = (name: string): string => {
  const nameLower = name.toLowerCase()
  if (nameLower.includes('10%') || nameLower.includes('rabatt')) return discount10
  if (nameLower.includes('kaffee') || nameLower.includes('coffee')) return freeCoffee
  if (nameLower.includes('brot') || nameLower.includes('bread')) return freeBread
  return surpriseGift // Default image
}

export function RewardCard({ reward, currentPoints, onRedeem }: RewardCardProps) {
  const canAfford = currentPoints >= reward.points_required
  const pointsNeeded = reward.points_required - currentPoints
  const rewardImage = getRewardImage(reward.name)

  return (
    <Card className={`group overflow-hidden transition-all duration-300 hover:shadow-xl ${
      canAfford ? 'hover:scale-105 border-primary/30' : 'opacity-75'
    }`}>
      <div className="relative">
        {/* Reward Image */}
        <div className="aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted">
          <img 
            src={rewardImage} 
            alt={reward.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
        
        {/* Points Badge */}
        <div className="absolute top-3 right-3">
          <Badge 
            variant={canAfford ? "default" : "secondary"}
            className={`flex items-center gap-1 font-semibold shadow-md ${
              canAfford ? 'bg-primary text-primary-foreground' : ''
            }`}
          >
            <Star className="w-3 h-3" />
            {reward.points_required}
          </Badge>
        </div>

        {/* Availability Indicator */}
        {!canAfford && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Reward Info */}
        <div className="space-y-1">
          <h3 className="font-heading font-semibold text-lg leading-tight">{reward.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{reward.description}</p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {canAfford ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" variant="dorfladen" size="sm">
                  <Gift className="w-4 h-4 mr-2" />
                  Jetzt abholen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Belohnung abholen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Möchten Sie "{reward.name}" für {reward.points_required} Punkte abholen? 
                    Die Punkte werden sofort abgezogen und Sie erhalten einen QR-Code zum Einlösen im Laden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onRedeem(reward)}>
                    Ja, abholen ({reward.points_required} Punkte)
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button 
              disabled 
              className="w-full" 
              variant="secondary" 
              size="sm"
            >
              <Lock className="w-4 h-4 mr-2" />
              Noch {pointsNeeded.toLocaleString()} Punkte
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}