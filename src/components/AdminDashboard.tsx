import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Plus, Settings, TrendingUp, Euro, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface Customer {
  id: string
  name: string
  email: string
  points: number
  created_at: string
}

interface Reward {
  id: string
  name: string
  points_required: number
  description: string
  active: boolean
}

export function AdminDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalPoints: 0,
    totalTransactions: 0
  })
  const [loading, setLoading] = useState(true)
  const [newReward, setNewReward] = useState({
    name: '',
    points_required: 0,
    description: ''
  })
  const [addPointsData, setAddPointsData] = useState({
    customerId: '',
    points: 0,
    description: ''
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    await Promise.all([
      fetchCustomers(),
      fetchRewards(),
      fetchStats()
    ])
    setLoading(false)
  }

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching customers:', error)
    } else {
      setCustomers(data || [])
    }
  }

  const fetchRewards = async () => {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('points_required', { ascending: true })

    if (error) {
      console.error('Error fetching rewards:', error)
    } else {
      setRewards(data || [])
    }
  }

  const fetchStats = async () => {
    const { data: customers } = await supabase
      .from('customers')
      .select('points')

    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')

    const totalCustomers = customers?.length || 0
    const totalPoints = customers?.reduce((sum, c) => sum + c.points, 0) || 0
    const totalTransactions = transactions?.length || 0

    setStats({
      totalCustomers,
      totalPoints,
      totalTransactions
    })
  }

  const addPoints = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const customer = customers.find(c => c.id === addPointsData.customerId)
    if (!customer) {
      toast({
        title: "Fehler",
        description: "Kunde nicht gefunden.",
        variant: "destructive",
      })
      return
    }

    const newPointsTotal = customer.points + addPointsData.points

    const { error: updateError } = await supabase
      .from('customers')
      .update({ points: newPointsTotal })
      .eq('id', addPointsData.customerId)

    if (updateError) {
      toast({
        title: "Fehler",
        description: "Punkte konnten nicht hinzugefügt werden.",
        variant: "destructive",
      })
      return
    }

    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        customer_id: addPointsData.customerId,
        amount: addPointsData.points, // Amount in euros for purchase
        points_earned: addPointsData.points,
        type: 'purchase',
        description: addPointsData.description || `Einkauf über €${addPointsData.points}`
      })

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
    }

    toast({
      title: "Punkte hinzugefügt",
      description: `${addPointsData.points} Punkte wurden zu ${customer.name} hinzugefügt.`,
    })

    setAddPointsData({ customerId: '', points: 0, description: '' })
    fetchCustomers()
    fetchStats()
  }

  const createReward = async (e: React.FormEvent) => {
    e.preventDefault()

    const { error } = await supabase
      .from('rewards')
      .insert({
        name: newReward.name,
        points_required: newReward.points_required,
        description: newReward.description,
        active: true
      })

    if (error) {
      toast({
        title: "Fehler",
        description: "Belohnung konnte nicht erstellt werden.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Belohnung erstellt",
      description: `${newReward.name} wurde erfolgreich erstellt.`,
    })

    setNewReward({ name: '', points_required: 0, description: '' })
    fetchRewards()
  }

  const toggleReward = async (rewardId: string, active: boolean) => {
    const { error } = await supabase
      .from('rewards')
      .update({ active: !active })
      .eq('id', rewardId)

    if (error) {
      toast({
        title: "Fehler",
        description: "Belohnung konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
      return
    }

    fetchRewards()
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-loyalty-gold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Verwalten Sie Ihr Loyalty-Programm</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kunden gesamt</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Punkte im Umlauf</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loyalty-gold">{stats.totalPoints}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transaktionen</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="customers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="customers">Kunden</TabsTrigger>
            <TabsTrigger value="rewards">Belohnungen</TabsTrigger>
            <TabsTrigger value="points">Punkte verwalten</TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>Kundenübersicht</CardTitle>
                <CardDescription>
                  Alle registrierten Kunden und ihre Punktestände
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Punkte</TableHead>
                      <TableHead>Registriert</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{customer.points} Punkte</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(customer.created_at).toLocaleDateString('de-DE')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Belohnungen verwalten</h3>
                  <p className="text-muted-foreground">Erstellen und verwalten Sie Belohnungen</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Neue Belohnung
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Neue Belohnung erstellen</DialogTitle>
                      <DialogDescription>
                        Erstellen Sie eine neue Belohnung für Ihre Kunden
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={createReward} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reward-name">Name</Label>
                        <Input
                          id="reward-name"
                          value={newReward.name}
                          onChange={(e) => setNewReward({...newReward, name: e.target.value})}
                          placeholder="z.B. 10% Rabatt"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reward-points">Benötigte Punkte</Label>
                        <Input
                          id="reward-points"
                          type="number"
                          value={newReward.points_required}
                          onChange={(e) => setNewReward({...newReward, points_required: parseInt(e.target.value) || 0})}
                          min="1"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reward-description">Beschreibung</Label>
                        <Input
                          id="reward-description"
                          value={newReward.description}
                          onChange={(e) => setNewReward({...newReward, description: e.target.value})}
                          placeholder="Beschreibung der Belohnung"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        Belohnung erstellen
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="pt-6">
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
                            <Badge variant="outline" className="mt-1">
                              {reward.points_required} Punkte
                            </Badge>
                          </div>
                          <Button
                            variant={reward.active ? "default" : "secondary"}
                            size="sm"
                            onClick={() => toggleReward(reward.id, reward.active)}
                          >
                            {reward.active ? "Aktiv" : "Inaktiv"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="points">
            <Card>
              <CardHeader>
                <CardTitle>Punkte hinzufügen</CardTitle>
                <CardDescription>
                  Fügen Sie Punkten zu Kundenkonten hinzu (z.B. nach einem Einkauf)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={addPoints} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="customer-select">Kunde</Label>
                    <select
                      id="customer-select"
                      className="w-full p-2 border rounded-md bg-background"
                      value={addPointsData.customerId}
                      onChange={(e) => setAddPointsData({...addPointsData, customerId: e.target.value})}
                      required
                    >
                      <option value="">Kunde auswählen</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} ({customer.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="points-amount">Einkaufsbetrag (€)</Label>
                    <Input
                      id="points-amount"
                      type="number"
                      value={addPointsData.points}
                      onChange={(e) => setAddPointsData({...addPointsData, points: parseInt(e.target.value) || 0})}
                      min="1"
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      1 Euro = 1 Punkt
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchase-description">Beschreibung (optional)</Label>
                    <Input
                      id="purchase-description"
                      value={addPointsData.description}
                      onChange={(e) => setAddPointsData({...addPointsData, description: e.target.value})}
                      placeholder="z.B. Einkauf vom 01.01.2024"
                    />
                  </div>
                  <Button type="submit" disabled={!addPointsData.customerId || addPointsData.points <= 0}>
                    <Euro className="w-4 h-4 mr-2" />
                    Punkte hinzufügen
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}