import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Star, LogOut, Trophy, ShoppingBag, QrCode, X, FileImage } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { QRCodeSVG } from 'qrcode.react'

interface Customer {
  id: string
  name: string
  email: string
  points: number
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

interface ContentBlock {
  id: string
  title: string
  image_url: string | null
  body: string
  active: boolean
  created_at: string
  updated_at: string
}

export function CustomerDashboard() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [contentBlock, setContentBlock] = useState<ContentBlock | null>(null)
  const [showContentBlock, setShowContentBlock] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user, signOut } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      fetchCustomerData()
      fetchTransactions()
      fetchRewards()
      fetchActiveContentBlock()
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
          points: 0
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
      .limit(10)

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

  const fetchActiveContentBlock = async () => {
    const { data, error } = await supabase
      .from('content_blocks')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching content block:', error)
    } else if (data) {
      setContentBlock(data)
      setShowContentBlock(true)
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

    const { error: updateError } = await supabase
      .from('customers')
      .update({ points: newPoints })
      .eq('id', customer.id)

    if (updateError) {
      toast({
        title: "Fehler",
        description: "Die Belohnung konnte nicht eingelöst werden.",
        variant: "destructive",
      })
      return
    }

    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        customer_id: customer.id,
        amount: 0,
        points_earned: -reward.points_required,
        type: 'redemption',
        description: `Belohnung eingelöst: ${reward.name}`
      })

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
    }

    setCustomer({ ...customer, points: newPoints })
    toast({
      title: "Belohnung eingelöst!",
      description: `Sie haben ${reward.name} erfolgreich eingelöst.`,
    })
    
    fetchTransactions()
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
          <div>
            <h1 className="text-3xl font-bold text-loyalty-gold">Shop Loyalty</h1>
            <p className="text-muted-foreground">Willkommen, {customer.name}!</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Abmelden
          </Button>
        </div>

        {/* Points and QR Code Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-r from-loyalty-gold/10 to-loyalty-silver/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-loyalty-gold" />
                Ihre Punkte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-loyalty-gold mb-2">
                  {customer.points}
                </div>
                <p className="text-muted-foreground">
                  1 Euro = 1 Punkt beim Einkauf
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Ihr QR-Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white rounded-lg">
                    <QRCodeSVG 
                      value={customer.id} 
                      size={150}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Zeigen Sie diesen Code an der Kasse vor
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rewards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Verfügbare Belohnungen
            </CardTitle>
            <CardDescription>
              Lösen Sie Ihre Punkte gegen tolle Belohnungen ein
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{reward.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {reward.description}
                      </p>
                    </div>
                    <Badge variant={customer.points >= reward.points_required ? "default" : "secondary"}>
                      {reward.points_required} Punkte
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    disabled={customer.points < reward.points_required}
                    onClick={() => redeemReward(reward)}
                    className="w-full"
                  >
                    {customer.points >= reward.points_required ? "Einlösen" : "Nicht genügend Punkte"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Letzte Aktivitäten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Noch keine Transaktionen vorhanden
                </p>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {transaction.amount > 0 ? `€${transaction.amount.toFixed(2)}` : ''}
                        </p>
                        <p className={`text-sm ${
                          transaction.points_earned > 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {transaction.points_earned > 0 ? '+' : ''}{transaction.points_earned} Punkte
                        </p>
                      </div>
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Content Block */}
        {contentBlock && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="w-5 h-5" />
                {contentBlock.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contentBlock.image_url && (
                  <div className="w-full">
                    <img
                      src={contentBlock.image_url}
                      alt={contentBlock.title}
                      className="w-full max-h-64 object-cover rounded-lg"
                      onError={(e) => {
                        console.error('Error loading image:', contentBlock.image_url);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {contentBlock.body}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Content Block Dialog */}
      <Dialog open={showContentBlock} onOpenChange={setShowContentBlock}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {contentBlock?.title}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowContentBlock(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {contentBlock?.image_url && (
              <img
                src={contentBlock.image_url}
                alt={contentBlock.title}
                className="w-full max-h-64 object-cover rounded-lg"
                onError={(e) => {
                  console.error('Error loading image:', contentBlock.image_url);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <DialogDescription className="text-base whitespace-pre-wrap">
              {contentBlock?.body}
            </DialogDescription>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowContentBlock(false)}>
              Verstanden
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}