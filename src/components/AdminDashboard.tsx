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
import { Users, Plus, Settings, TrendingUp, Euro, Star, QrCode, LogOut, Upload, Edit, Trash2, FileImage } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
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

interface ContentBlock {
  id: string
  title: string
  image_url: string | null
  body: string
  active: boolean
  created_at: string
  updated_at: string
}

export function AdminDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([])
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
  const [newContentBlock, setNewContentBlock] = useState({
    title: '',
    body: '',
    image_url: null as string | null
  })
  const [editingContentBlock, setEditingContentBlock] = useState<ContentBlock | null>(null)
  const [addPointsData, setAddPointsData] = useState({
    customerId: '',
    points: 0,
    description: ''
  })
  const [scannedCustomerId, setScannedCustomerId] = useState<string | null>(null)
  const [scannedCustomer, setScannedCustomer] = useState<Customer | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { signOut } = useAuth()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    await Promise.all([
      fetchCustomers(),
      fetchRewards(),
      fetchContentBlocks(),
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

  const fetchContentBlocks = async () => {
    const { data, error } = await supabase
      .from('content_blocks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching content blocks:', error)
    } else {
      setContentBlocks(data || [])
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

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `content-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('content-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: "Upload-Fehler",
        description: "Bild konnte nicht hochgeladen werden.",
        variant: "destructive",
      })
      return null
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    const imageUrl = await uploadImage(file)
    if (imageUrl) {
      if (editingContentBlock) {
        setEditingContentBlock({ ...editingContentBlock, image_url: imageUrl })
      } else {
        setNewContentBlock({ ...newContentBlock, image_url: imageUrl })
      }
      toast({
        title: "Bild hochgeladen",
        description: "Das Bild wurde erfolgreich hochgeladen.",
      })
    }
    setUploadingImage(false)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const createContentBlock = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newContentBlock.title.trim() || !newContentBlock.body.trim()) {
      toast({
        title: "Fehler",
        description: "Titel und Inhalt sind erforderlich.",
        variant: "destructive",
      })
      return
    }

    const { error } = await supabase
      .from('content_blocks')
      .insert({
        title: newContentBlock.title,
        body: newContentBlock.body,
        image_url: newContentBlock.image_url,
        active: true
      })

    if (error) {
      toast({
        title: "Fehler",
        description: "Content-Block konnte nicht erstellt werden.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Content-Block erstellt",
      description: `${newContentBlock.title} wurde erfolgreich erstellt.`,
    })

    setNewContentBlock({ title: '', body: '', image_url: null })
    fetchContentBlocks()
  }

  const updateContentBlock = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingContentBlock) return

    const { error } = await supabase
      .from('content_blocks')
      .update({
        title: editingContentBlock.title,
        body: editingContentBlock.body,
        image_url: editingContentBlock.image_url
      })
      .eq('id', editingContentBlock.id)

    if (error) {
      toast({
        title: "Fehler",
        description: "Content-Block konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Content-Block aktualisiert",
      description: "Der Content-Block wurde erfolgreich aktualisiert.",
    })

    setEditingContentBlock(null)
    fetchContentBlocks()
  }

  const toggleContentBlock = async (contentBlockId: string, active: boolean) => {
    const { error } = await supabase
      .from('content_blocks')
      .update({ active: !active })
      .eq('id', contentBlockId)

    if (error) {
      toast({
        title: "Fehler",
        description: "Content-Block konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Status geändert",
      description: `Content-Block wurde ${!active ? 'aktiviert' : 'deaktiviert'}.`,
    })

    fetchContentBlocks()
  }

  const deleteContentBlock = async (contentBlockId: string) => {
    const { error } = await supabase
      .from('content_blocks')
      .delete()
      .eq('id', contentBlockId)

    if (error) {
      toast({
        title: "Fehler",
        description: "Content-Block konnte nicht gelöscht werden.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Content-Block gelöscht",
      description: "Der Content-Block wurde erfolgreich gelöscht.",
    })

    fetchContentBlocks()
  }

  const handleQRScan = async (customerId: string) => {
    try {
      const customer = customers.find(c => c.id === customerId)
      if (customer) {
        setScannedCustomerId(customerId)
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

  const addPointsToScannedCustomer = async (points: number) => {
    if (!scannedCustomerId || !scannedCustomer) return

    setLoading(true)
    try {
      // Add transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([
          {
            customer_id: scannedCustomerId,
            type: 'purchase',
            points_earned: points,
            amount: 0,
            description: `POS +${points} Punkte`
          }
        ])

      if (transactionError) throw transactionError

      // Update customer points
      const { error: customerError } = await supabase
        .from('customers')
        .update({ 
          points: scannedCustomer.points + points,
          total_points: scannedCustomer.total_points + points,
          updated_at: new Date().toISOString()
        })
        .eq('id', scannedCustomerId)

      if (customerError) throw customerError

      toast({
        title: "Punkte hinzugefügt",
        description: `${points} Punkte wurden ${scannedCustomer.name} gutgeschrieben. Neuer Punktestand: ${scannedCustomer.points + points}`
      })

      // Refresh data and reset scanner
      await fetchData()
      setScannedCustomerId(null)
      setScannedCustomer(null)
    } catch (error) {
      console.error('Error adding points:', error)
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Hinzufügen der Punkte."
      })
    } finally {
      setLoading(false)
    }
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
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Abmelden
          </Button>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="customers">Kunden</TabsTrigger>
            <TabsTrigger value="rewards">Belohnungen</TabsTrigger>
            <TabsTrigger value="points">Punkte verwalten</TabsTrigger>
            <TabsTrigger value="scanner">QR-Scanner</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
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
                      
                      <div className="space-y-2">
                        <Label>Schnell-Aktionen</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            onClick={() => addPointsToScannedCustomer(10)}
                            disabled={loading}
                            className="w-full"
                          >
                            +10 Punkte
                          </Button>
                          <Button 
                            onClick={() => addPointsToScannedCustomer(20)}
                            disabled={loading}
                            variant="outline"
                            className="w-full"
                          >
                            +20 Punkte
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            onClick={() => addPointsToScannedCustomer(50)}
                            disabled={loading}
                            variant="outline"
                            className="w-full"
                          >
                            +50 Punkte
                          </Button>
                          <Button 
                            onClick={() => addPointsToScannedCustomer(100)}
                            disabled={loading}
                            variant="outline"
                            className="w-full"
                          >
                            +100 Punkte
                          </Button>
                        </div>
                      </div>

                      <Button 
                        onClick={() => {
                          setScannedCustomerId(null)
                          setScannedCustomer(null)
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

          <TabsContent value="content">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Content-Blocks verwalten</h3>
                  <p className="text-muted-foreground">Erstellen und verwalten Sie Content-Blocks mit Bildern und Text</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Neuer Content-Block
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Neuen Content-Block erstellen</DialogTitle>
                      <DialogDescription>
                        Erstellen Sie einen neuen Content-Block mit Bild und Text
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={createContentBlock} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="content-title">Titel</Label>
                        <Input
                          id="content-title"
                          value={newContentBlock.title}
                          onChange={(e) => setNewContentBlock({...newContentBlock, title: e.target.value})}
                          placeholder="z.B. Willkommen in unserem Shop!"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Bild hochladen (optional)</Label>
                        <div className="space-y-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="w-full"
                          >
                            {uploadingImage ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                Wird hochgeladen...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Bild auswählen
                              </>
                            )}
                          </Button>
                          {newContentBlock.image_url && (
                            <div className="relative">
                              <img
                                src={newContentBlock.image_url}
                                alt="Preview"
                                className="w-full h-32 object-cover rounded border"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute top-1 right-1"
                                onClick={() => setNewContentBlock({...newContentBlock, image_url: null})}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="content-body">Inhalt</Label>
                        <Textarea
                          id="content-body"
                          value={newContentBlock.body}
                          onChange={(e) => setNewContentBlock({...newContentBlock, body: e.target.value})}
                          placeholder="Ihr Content-Text..."
                          rows={6}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        <FileImage className="w-4 h-4 mr-2" />
                        Content-Block erstellen
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Alle Content-Blocks</CardTitle>
                  <CardDescription>
                    Nur ein Content-Block kann gleichzeitig aktiv sein
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {contentBlocks.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Keine Content-Blocks vorhanden.</p>
                  ) : (
                    <div className="space-y-4">
                      {contentBlocks.map((contentBlock) => (
                        <div key={contentBlock.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{contentBlock.title}</h3>
                                <Badge variant={contentBlock.active ? "default" : "secondary"}>
                                  {contentBlock.active ? "Aktiv" : "Inaktiv"}
                                </Badge>
                              </div>
                              
                              {contentBlock.image_url && (
                                <img
                                  src={contentBlock.image_url}
                                  alt={contentBlock.title}
                                  className="w-full max-w-md h-32 object-cover rounded border"
                                />
                              )}
                              
                              <p className="text-sm text-muted-foreground">
                                {contentBlock.body}
                              </p>
                              
                              <p className="text-xs text-muted-foreground">
                                Erstellt: {new Date(contentBlock.created_at).toLocaleDateString('de-DE', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingContentBlock(contentBlock)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Switch
                                checked={contentBlock.active}
                                onCheckedChange={() => toggleContentBlock(contentBlock.id, contentBlock.active)}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteContentBlock(contentBlock.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Content Block Dialog */}
        <Dialog open={!!editingContentBlock} onOpenChange={() => setEditingContentBlock(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Content-Block bearbeiten</DialogTitle>
              <DialogDescription>
                Bearbeiten Sie den Content-Block
              </DialogDescription>
            </DialogHeader>
            {editingContentBlock && (
              <form onSubmit={updateContentBlock} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-content-title">Titel</Label>
                  <Input
                    id="edit-content-title"
                    value={editingContentBlock.title}
                    onChange={(e) => setEditingContentBlock({...editingContentBlock, title: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Bild</Label>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full"
                    >
                      {uploadingImage ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                          Wird hochgeladen...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Neues Bild wählen
                        </>
                      )}
                    </Button>
                    {editingContentBlock.image_url && (
                      <div className="relative">
                        <img
                          src={editingContentBlock.image_url}
                          alt="Preview"
                          className="w-full h-32 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={() => setEditingContentBlock({...editingContentBlock, image_url: null})}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-content-body">Inhalt</Label>
                  <Textarea
                    id="edit-content-body"
                    value={editingContentBlock.body}
                    onChange={(e) => setEditingContentBlock({...editingContentBlock, body: e.target.value})}
                    rows={6}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    <FileImage className="w-4 h-4 mr-2" />
                    Speichern
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingContentBlock(null)}>
                    Abbrechen
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}