import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Users, Plus, Settings, TrendingUp, Euro, Star, QrCode, LogOut, Edit, Trash2, Gift, History, CheckCircle, Clock, Filter, Eye, ShoppingBag } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { Link } from 'react-router-dom'
import { QRScanner } from '@/components/QRScanner'
import { getRankByPoints } from '@/lib/ranks'

interface Customer {
  id: string
  name: string
  email: string
  points: number
  total_points: number
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
}

interface Transaction {
  id: string
  customer_id: string
  amount: number
  points_earned: number
  type: 'purchase' | 'redemption'
  description: string
  created_at: string
  customer?: {
    id: string
    name: string
    email: string
  }
}

export function AdminDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalPoints: 0,
    totalTransactions: 0
  })
  const [transactionFilters, setTransactionFilters] = useState({
    customer: '',
    type: '',
    dateFrom: '',
    dateTo: ''
  })
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
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
  const [scannedCustomerId, setScannedCustomerId] = useState<string | null>(null)
  const [scannedCustomer, setScannedCustomer] = useState<Customer | null>(null)
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [processingPurchase, setProcessingPurchase] = useState(false)
  const { toast } = useToast()
  const { signOut } = useAuth()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    await Promise.all([
      fetchCustomers(),
      fetchRewards(),
      fetchClaims(),
      fetchTransactions(),
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


  const fetchClaims = async () => {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching claims:', error)
    } else {
      setClaims((data as Claim[]) || [])
    }
  }

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(id, name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
    } else {
      setTransactions((data as Transaction[]) || [])
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
    const newTotalPoints = customer.total_points + addPointsData.points

    const { error: updateError } = await supabase
      .from('customers')
      .update({ 
        points: newPointsTotal,
        total_points: newTotalPoints
      })
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



  const handleQRScan = async (code: string) => {
    try {
      // Check if it's a claim QR code
      if (code.startsWith('claim_')) {
        await handleClaimQRScan(code)
        return
      }
      
      // Otherwise handle as customer QR code
      const customer = customers.find(c => c.id === code)
      if (customer) {
        setScannedCustomerId(code)
        setScannedCustomer(customer)
        toast({
          title: "Kunde gescannt",
          description: `${customer.name} (${customer.email}) wurde erfolgreich gescannt.`
        })
      } else {
        toast({
          variant: "destructive",
          title: "Kunde nicht gefunden",
          description: "Der gescannte QR-Code gehört zu keinem bekannten Kunden."
        })
      }
    } catch (error) {
      console.error('Error handling QR scan:', error)
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fehler beim Verarbeiten des QR-Codes."
      })
    }
  }

  const handleClaimQRScan = async (qrCode: string) => {
    const claim = claims.find(c => c.qr_code === qrCode && c.status === 'EINGELÖST')
    
    if (!claim) {
      toast({
        variant: "destructive",
        title: "Ungültiger QR-Code",
        description: "Dieser QR-Code ist ungültig oder wurde bereits eingelöst."
      })
      return
    }

    const customer = customers.find(c => c.id === claim.customer_id)
    
    try {
      // Mark claim as completed
      const { error } = await supabase
        .from('claims')
        .update({ status: 'ABGEHOLT' })
        .eq('id', claim.id)

      if (error) throw error

      toast({
        title: "Gutschein abgeholt!",
        description: `${claim.reward_name} wurde an ${customer?.name || 'Kunde'} ausgegeben.`
      })

      // Refresh claims data
      await fetchClaims()
      
    } catch (error) {
      console.error('Error processing claim:', error)
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fehler beim Abholen des Gutscheins."
      })
    }
  }

  const awardPointsForPurchase = async (amount: number) => {
    if (!scannedCustomerId || !scannedCustomer || amount <= 0) return

    setProcessingPurchase(true)
    try {
      const scanUuid = crypto.randomUUID()
      
      const { data, error } = await supabase.functions.invoke('award-points', {
        body: {
          customer_id: scannedCustomerId,
          amount,
          description: 'POS Einkauf',
          scan_uuid: scanUuid
        }
      })

      if (error) throw error

      if (!data.success) {
        throw new Error(data.error || 'Unbekannter Fehler')
      }

      toast({
        title: "Punkte vergeben!",
        description: `+${data.points_awarded} Punkte für ${amount.toFixed(2)} € Einkauf vergeben. Neuer Punktestand: ${data.new_points_balance} Punkte.`
      })

      // Refresh data and reset scanner
      await fetchData()
      setScannedCustomerId(null)
      setScannedCustomer(null)
      setPurchaseAmount('')
    } catch (error) {
      console.error('Error awarding points:', error)
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Vergeben der Punkte."
      })
    } finally {
      setProcessingPurchase(false)
    }
  }

  const handleProcessPurchase = () => {
    const amount = parseFloat(purchaseAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Ungültiger Betrag",
        description: "Bitte geben Sie einen gültigen Einkaufsbetrag ein."
      })
      return
    }
    awardPointsForPurchase(amount)
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
            <h1 className="text-3xl font-heading font-bold text-primary">Admin Dashboard</h1>
            <p className="text-muted-foreground">Verwalten Sie Ihr Loyalty-Programm</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/offers" className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Angebote verwalten
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/pickups" className="flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Abholungen verwalten
              </Link>
            </Button>
            <Button variant="dorfladen" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Abmelden
            </Button>
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
              <div className="text-2xl font-bold text-primary">{stats.totalPoints}</div>
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="customers">Kunden</TabsTrigger>
            <TabsTrigger value="rewards">Belohnungen</TabsTrigger>
            <TabsTrigger value="claims">Gutscheine ({claims.filter(c => c.status === 'EINGELÖST').length})</TabsTrigger>
            <TabsTrigger value="history">Punkte-Historie</TabsTrigger>
            <TabsTrigger value="points">Punkte verwalten</TabsTrigger>
            <TabsTrigger value="scanner">QR-Scanner</TabsTrigger>
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
                        <TableHead>Aktive Punkte</TableHead>
                        <TableHead>Gesammelte Punkte</TableHead>
                        <TableHead>Rang</TableHead>
                        <TableHead>Registriert</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => {
                        const rank = getRankByPoints(customer.total_points);
                        return (
                          <TableRow key={customer.id}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>{customer.email}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{customer.points} aktive Punkte</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{customer.total_points} gesamt</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{rank.emoji}</span>
                                <span className="text-sm">{rank.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(customer.created_at).toLocaleDateString('de-DE')}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims">
            <Tabs defaultValue="open-claims" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="open-claims">Offene Gutscheine ({claims.filter(c => c.status === 'EINGELÖST').length})</TabsTrigger>
                <TabsTrigger value="completed-claims">Abgeholt ({claims.filter(c => c.status === 'ABGEHOLT').length})</TabsTrigger>
              </TabsList>

              <TabsContent value="open-claims">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Offene Gutscheine
                    </CardTitle>
                    <CardDescription>
                      Eingelöste Belohnungen, die noch nicht abgeholt wurden
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {claims.filter(claim => claim.status === 'EINGELÖST').length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Keine offenen Gutscheine vorhanden</p>
                    ) : (
                      <div className="space-y-4">
                        {claims.filter(claim => claim.status === 'EINGELÖST').map((claim) => {
                          const customer = customers.find(c => c.id === claim.customer_id);
                          return (
                            <div key={claim.id} className="border rounded-lg p-4 space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-semibold">{claim.reward_name}</h3>
                                  <p className="text-sm text-muted-foreground">{claim.reward_description}</p>
                                  <p className="text-sm">
                                    Kunde: <span className="font-medium">{customer?.name || 'Unbekannt'}</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Eingelöst: {new Date(claim.created_at).toLocaleDateString('de-DE', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge variant="secondary">{claim.points_redeemed} Punkte</Badge>
                                  <p className="text-xs text-muted-foreground mt-1">QR: {claim.qr_code.slice(-8)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="completed-claims">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Abgeholte Gutscheine
                    </CardTitle>
                    <CardDescription>
                      Bereits abgeholte Belohnungen
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {claims.filter(claim => claim.status === 'ABGEHOLT').length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Keine abgeholten Gutscheine vorhanden</p>
                    ) : (
                      <div className="space-y-4">
                        {claims.filter(claim => claim.status === 'ABGEHOLT').map((claim) => {
                          const customer = customers.find(c => c.id === claim.customer_id);
                          return (
                            <div key={claim.id} className="border rounded-lg p-4 space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-semibold">{claim.reward_name}</h3>
                                  <p className="text-sm text-muted-foreground">{claim.reward_description}</p>
                                  <p className="text-sm">
                                    Kunde: <span className="font-medium">{customer?.name || 'Unbekannt'}</span>
                                  </p>
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    <p>Eingelöst: {new Date(claim.created_at).toLocaleDateString('de-DE', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}</p>
                                    <p>Abgeholt: {new Date(claim.updated_at).toLocaleDateString('de-DE', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant="outline">Abgeholt</Badge>
                                  <p className="text-xs text-muted-foreground mt-1">{claim.points_redeemed} Punkte</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-4">
              {selectedCustomerId ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <History className="w-5 h-5" />
                          Kundendetails - {customers.find(c => c.id === selectedCustomerId)?.name}
                        </CardTitle>
                        <CardDescription>
                          Alle Transaktionen dieses Kunden
                        </CardDescription>
                      </div>
                      <Button variant="dorfladen" onClick={() => setSelectedCustomerId(null)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Zurück zur Übersicht
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Datum</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Punkte</TableHead>
                          <TableHead>Beschreibung</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions
                          .filter(t => t.customer_id === selectedCustomerId)
                          .map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                {new Date(transaction.created_at).toLocaleDateString('de-DE', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </TableCell>
                              <TableCell>
                                <Badge variant={transaction.type === 'purchase' ? 'default' : 'secondary'}>
                                  {transaction.type === 'purchase' ? 'Einkauf' : 'Einlösung'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className={transaction.points_earned >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {transaction.points_earned >= 0 ? '+' : ''}{transaction.points_earned}
                                </span>
                              </TableCell>
                              <TableCell>{transaction.description}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Punkte-Historie
                    </CardTitle>
                    <CardDescription>
                      Alle Punktevergaben und -einlösungen verwalten
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Label>Kunde</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={transactionFilters.customer}
                          onChange={(e) => setTransactionFilters({...transactionFilters, customer: e.target.value})}
                        >
                          <option value="">Alle Kunden</option>
                          {customers.map(customer => (
                            <option key={customer.id} value={customer.id}>{customer.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Typ</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={transactionFilters.type}
                          onChange={(e) => setTransactionFilters({...transactionFilters, type: e.target.value})}
                        >
                          <option value="">Alle Typen</option>
                          <option value="purchase">Einkauf</option>
                          <option value="redemption">Einlösung</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Von</Label>
                        <Input
                          type="date"
                          value={transactionFilters.dateFrom}
                          onChange={(e) => setTransactionFilters({...transactionFilters, dateFrom: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bis</Label>
                        <Input
                          type="date"
                          value={transactionFilters.dateTo}
                          onChange={(e) => setTransactionFilters({...transactionFilters, dateTo: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Transactions Table */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kunde</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Punkte</TableHead>
                          <TableHead>Beschreibung</TableHead>
                          <TableHead>Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions
                          .filter(transaction => {
                            if (transactionFilters.customer && transaction.customer_id !== transactionFilters.customer) return false
                            if (transactionFilters.type && transaction.type !== transactionFilters.type) return false
                            if (transactionFilters.dateFrom) {
                              const transactionDate = new Date(transaction.created_at).toISOString().split('T')[0]
                              if (transactionDate < transactionFilters.dateFrom) return false
                            }
                            if (transactionFilters.dateTo) {
                              const transactionDate = new Date(transaction.created_at).toISOString().split('T')[0]
                              if (transactionDate > transactionFilters.dateTo) return false
                            }
                            return true
                          })
                          .map((transaction) => {
                            const customer = customers.find(c => c.id === transaction.customer_id)
                            return (
                              <TableRow key={transaction.id}>
                                <TableCell className="font-medium">
                                  <button
                                    onClick={() => setSelectedCustomerId(transaction.customer_id)}
                                    className="text-blue-600 hover:underline"
                                  >
                                    {customer?.name || 'Unbekannt'}
                                  </button>
                                </TableCell>
                                <TableCell>
                                  {new Date(transaction.created_at).toLocaleDateString('de-DE', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={transaction.type === 'purchase' ? 'default' : 'secondary'}>
                                    {transaction.type === 'purchase' ? 'Einkauf' : 'Einlösung'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className={transaction.points_earned >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {transaction.points_earned >= 0 ? '+' : ''}{transaction.points_earned}
                                  </span>
                                </TableCell>
                                <TableCell>{transaction.description}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedCustomerId(transaction.customer_id)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Details
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
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
                      <Button type="submit" className="w-full" variant="dorfladen">
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

          <TabsContent value="scanner" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <QRScanner 
                  onScan={handleQRScan}
                  onError={(error) => toast({
                    variant: "destructive",
                    title: "Scanner Fehler",
                    description: error
                  })}
                />
              </div>
              
              <div>
                {scannedCustomer ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5" />
                        Gescannter Kunde
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <h3 className="font-semibold">{scannedCustomer.name}</h3>
                        <p className="text-sm text-muted-foreground">{scannedCustomer.email}</p>
                        <p className="text-lg font-medium">
                          Aktive Punkte: {scannedCustomer.points} | Gesamt: {scannedCustomer.total_points}
                        </p>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const rank = getRankByPoints(scannedCustomer.total_points);
                            return (
                              <>
                                <span>{rank.emoji}</span>
                                <Badge variant="outline" className="text-xs">
                                  {rank.name}
                                </Badge>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="purchase-amount">Einkaufsbetrag in €</Label>
                          <Input
                            id="purchase-amount"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={purchaseAmount}
                            onChange={(e) => setPurchaseAmount(e.target.value)}
                            disabled={processingPurchase}
                          />
                        </div>
                        <Button
                          onClick={handleProcessPurchase}
                          disabled={processingPurchase || !purchaseAmount}
                          className="w-full"
                          variant="dorfladen"
                        >
                          {processingPurchase ? 'Verarbeite...' : 'Punkte vergeben'}
                        </Button>
                      </div>

                      <Button 
                        onClick={() => {
                          setScannedCustomerId(null)
                          setScannedCustomer(null)
                          setPurchaseAmount('')
                        }}
                        variant="ghost"
                        className="w-full"
                      >
                        Zurücksetzen
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Anleitung</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Starten Sie den QR-Scanner</li>
                        <li>Lassen Sie den Kunden seinen QR-Code zeigen</li>
                        <li>Scannen Sie den Code</li>
                        <li>Wählen Sie die Punkteanzahl aus</li>
                        <li>Die Punkte werden automatisch gutgeschrieben</li>
                      </ol>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="badges">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Abzeichen-Übersicht</CardTitle>
                    <CardDescription>
                      Alle verfügbaren Abzeichen und ihre Erreichungsstatistiken
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Beschreibung</TableHead>
                        <TableHead>Bedingung</TableHead>
                        <TableHead>Erreicht von</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Keine Abzeichen-Daten verfügbar
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
    </div>
  )
}