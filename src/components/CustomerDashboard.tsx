import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Star, LogOut, Trophy, ShoppingBag, QrCode, Store, Gift, History, AlertCircle } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import logo from '@/assets/logo-dorfladen-eggenthal.png'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { QRCodeSVG } from 'qrcode.react'
import { getRankByPoints, getPointsToNextRank } from '@/lib/ranks'
import { RankDisplay } from '@/components/RankDisplay'
import { RewardCard } from '@/components/RewardCard'
import { BadgeDisplay } from '@/components/BadgeDisplay'
import OffersGrid from '@/components/OffersGrid'
import { PickupsList } from '@/components/PickupsList'

interface Customer {
  id: string
  name: string
  email: string
  points: number
  total_points: number
}

interface Transaction {
  id: string
  amount: number
  points_earned: number
  type: 'purchase' | 'redemption'
  description: string
  created_at: string
}

interface Reward {
  id: string
  name: string
  points_required: number
  description: string
  active: boolean
}

interface Claim {
  id: string
  customer_id: string
  reward_id: string
  qr_code: string
  status: 'EINGELÖST' | 'ABGEHOLT'
  points_redeemed: number
  reward_name: string
  reward_description: string
  created_at: string
  updated_at: string
  picked_up?: boolean
}

export function CustomerDashboard() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [customerBadges, setCustomerBadges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user, signOut } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      fetchCustomerData()
      fetchTransactions()
      fetchRewards()
      fetchClaims()
      fetchBadges()
      fetchCustomerBadges()
    }
  }, [user])

  const fetchCustomerData = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching customer:', error)
    } else if (data) {
      setCustomer(data)
    } else {
      // Create customer record if it doesn't exist
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || 'Kunde',
          points: 0,
          total_points: 0
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating customer:', createError)
      } else {
        setCustomer(newCustomer)
      }
    }
    setLoading(false)
  }

  const fetchTransactions = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
    } else {
      setTransactions((data as Transaction[]) || [])
    }
  }

  const fetchRewards = async () => {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('active', true)
      .order('points_required', { ascending: true })

    if (error) {
      console.error('Error fetching rewards:', error)
    } else {
      setRewards(data || [])
    }
  }

  const fetchClaims = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching claims:', error)
    } else {
      setClaims((data as Claim[]) || [])
    }
  }

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('active', true)
        .order('name')

      if (error) {
        console.error('Error fetching badges:', error)
        return
      }

      setBadges(data || [])
    } catch (error) {
      console.error('Error fetching badges:', error)
    }
  }

  const fetchCustomerBadges = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('customer_badges')
        .select('*, badges!inner(*)')
        .eq('customer_id', user.id)
        .order('unlocked_at', { ascending: false })

      if (error) {
        console.error('Error fetching customer badges:', error)
        return
      }

      setCustomerBadges(data || [])
    } catch (error) {
      console.error('Error fetching customer badges:', error)
    }
  }

  const redeemReward = async (reward: Reward) => {
    if (!customer || customer.points < reward.points_required) {
      toast({
        title: "Nicht genügend Punkte",
        description: `Sie benötigen ${reward.points_required} Punkte für diese Belohnung.`,
        variant: "destructive",
      })
      return
    }

    const newPoints = customer.points - reward.points_required
    const qrCode = `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // Start transaction: Update customer points, create claim, and create transaction
      const { error: updateError } = await supabase
        .from('customers')
        .update({ points: newPoints })
        .eq('id', customer.id)

      if (updateError) {
        throw updateError
      }

      const { data: claimData, error: claimError } = await supabase
        .from('claims')
        .insert({
          customer_id: customer.id,
          reward_id: reward.id,
          qr_code: qrCode,
          points_redeemed: reward.points_required,
          reward_name: reward.name,
          reward_description: reward.description
        })
        .select()
        .single()

      if (claimError) {
        throw claimError
      }

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          customer_id: customer.id,
          amount: 0,
          points_earned: -reward.points_required,
          type: 'redemption',
          description: `Belohnung eingelöst: ${reward.name}`,
          reward_id: reward.id,
          claim_id: claimData.id
        })

      if (transactionError) {
        console.error('Error creating transaction:', transactionError)
      }

      setCustomer({ ...customer, points: newPoints })
      toast({
        title: "Belohnung eingelöst!",
        description: `Sie haben ${reward.name} erfolgreich eingelöst. Zeigen Sie den QR-Code im Laden vor.`,
      })
      
      fetchTransactions()
      fetchClaims()

    } catch (error) {
      console.error('Error redeeming reward:', error)
      toast({
        title: "Fehler",
        description: "Die Belohnung konnte nicht eingelöst werden.",
        variant: "destructive",
      })
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Lädt...</p>
        </div>
      </div>
    )
  }

  if (!customer) {
    return <div>Kunde nicht gefunden</div>
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img 
              src={logo} 
              alt="Dorfladen Eggenthal" 
              className="h-16 w-auto"
            />
            <div>
              <h1 className="text-3xl font-heading font-bold text-primary">Dorfladen Eggenthal</h1>
              <p className="text-muted-foreground">Willkommen, {customer.name}!</p>
            </div>
          </div>
          <Button variant="dorfladen" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Abmelden
          </Button>
        </div>

        {/* Points and QR Code Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rank Display */}
          <RankDisplay 
            totalPoints={customer.total_points} 
            currentPoints={customer.points}
          />

          <Card className="bg-gradient-to-br from-dorfladen-green/5 to-dorfladen-green/10 border-dorfladen-green/20">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 p-3 rounded-full bg-dorfladen-green/10">
                    <QrCode className="w-8 h-8 text-dorfladen-green" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-heading font-semibold text-lg text-dorfladen-green">
                      Ihr QR-Code
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Zur Identifikation an der Kasse
                    </p>
                  </div>
                </div>

                {/* QR Code Display */}
                <div className="text-center py-4">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-white rounded-lg shadow-sm border border-dorfladen-green/20">
                      <QRCodeSVG 
                        value={customer.id} 
                        size={120}
                        level="M"
                        includeMargin={true}
                      />
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="pt-3 border-t border-border/50">
                  <p className="text-sm text-center text-muted-foreground">
                    An der Kasse scannen lassen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rewards and Claims */}
        <Tabs defaultValue="offers" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="offers">Angebote</TabsTrigger>
            <TabsTrigger value="rewards">Belohnungen</TabsTrigger>
            <TabsTrigger value="active">Abholungen</TabsTrigger>
            <TabsTrigger value="badges">Meine Abzeichen</TabsTrigger>
            <TabsTrigger value="points">Punkte</TabsTrigger>
            <TabsTrigger value="history">Verlauf</TabsTrigger>
          </TabsList>

          <TabsContent value="offers" className="space-y-4">
            <div className="space-y-6">
              <div>
                <h3 className="font-heading font-semibold text-xl mb-4">🛍️ Aktuelle Angebote</h3>
                <OffersGrid />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-4">
            <div className="space-y-6">
              {/* Current Points Display */}
              <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading font-semibold text-lg text-primary">Ihre verfügbaren Punkte</h3>
                      <p className="text-sm text-muted-foreground">Lösen Sie Ihre Punkte gegen tolle Belohnungen ein</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary">{customer.points.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Punkte verfügbar</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rewards Shop */}
              <div>
                <h3 className="font-heading font-semibold text-xl mb-4">🛍️ Belohnungen-Shop</h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {rewards.map((reward) => (
                    <RewardCard
                      key={reward.id}
                      reward={reward}
                      currentPoints={customer.points}
                      onRedeem={redeemReward}
                    />
                  ))}
                </div>
                
                {rewards.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Derzeit sind keine Belohnungen verfügbar</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Schauen Sie bald wieder vorbei für neue Angebote!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  Abholungen
                </CardTitle>
                <CardDescription>
                  Ihre Belohnungen und Bestellungen, die zur Abholung bereit sind
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PickupsList 
                  userId={customer.id} 
                  onRefresh={() => {
                    fetchClaims()
                    // Would also fetch orders when implemented
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="badges" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Meine Abzeichen
                </CardTitle>
                <CardDescription>
                  Ihre freigeschalteten Erfolge und Abzeichen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BadgeDisplay 
                  badges={badges} 
                  unlockedBadges={customerBadges.map(cb => cb.badge_id)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="points" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Meine Punkte-Historie
                </CardTitle>
                <CardDescription>
                  Übersicht über alle Ihre Punkteaktivitäten
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Current Points Balance */}
                <div className="mb-6 p-4 border rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading font-semibold text-lg">Aktueller Punktestand</h3>
                      <p className="text-sm text-muted-foreground">Verfügbare Punkte für Belohnungen</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary">{customer.points}</div>
                      <div className="text-sm text-muted-foreground">von {customer.total_points} gesammelten Punkten</div>
                    </div>
                  </div>
                </div>

                {/* Transaction History */}
                <div className="space-y-3">
                  <h4 className="font-medium">Letzte Aktivitäten</h4>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Noch keine Punkteaktivitäten vorhanden</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Ihre ersten Punkte erhalten Sie beim nächsten Einkauf
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              transaction.type === 'purchase' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <p className="font-medium text-sm">{transaction.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.created_at).toLocaleDateString('de-DE', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${
                              transaction.points_earned >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.points_earned >= 0 ? '+' : ''}{transaction.points_earned}
                            </div>
                            <div className="text-xs text-muted-foreground">Punkte</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Belohnungshistorie
                </CardTitle>
                <CardDescription>
                  Ihre bereits abgeholten Belohnungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {claims.filter(claim => claim.picked_up).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Noch keine Belohnungen abgeholt
                    </p>
                  ) : (
                    claims.filter(claim => claim.picked_up).map((claim) => (
                      <div key={claim.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold">{claim.reward_name}</h3>
                            <p className="text-sm text-muted-foreground">{claim.reward_description}</p>
                            <p className="text-xs text-muted-foreground">
                              Eingelöst: {new Date(claim.created_at).toLocaleDateString('de-DE')} • 
                              Abgeholt: {new Date(claim.updated_at).toLocaleDateString('de-DE')}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">Abgeholt</Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              {claim.points_redeemed} Punkte
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}