import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';
import { Search, Scan, Package, Gift, Calendar, User, Hash, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PickupItem {
  item_type: string;
  item_id: string;
  user_id: string;
  pickup_code: string;
  title: string;
  qty: number;
  points: number | null;
  status: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
}

export default function AdminPickupsPage() {
  const { isAdmin, loading, user } = useAdmin();
  const { toast } = useToast();
  const [pickups, setPickups] = useState<PickupItem[]>([]);
  const [filteredPickups, setFilteredPickups] = useState<PickupItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'open' | 'all'>('open');
  const [scanCode, setScanCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const fetchPickups = async () => {
    if (!isAdmin) return;
    
    try {
      const { data, error } = await supabase
        .from('pickup_queue_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPickups(data || []);
    } catch (error) {
      console.error('Error fetching pickups:', error);
      toast({
        title: 'Fehler',
        description: 'Fehler beim Laden der Abholungen',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchPickups();
  }, [isAdmin]);

  useEffect(() => {
    let filtered = pickups;

    // Status filter
    if (statusFilter === 'open') {
      filtered = filtered.filter(item => 
        (item.item_type === 'reward' && item.status === 'EINGELÖST') ||
        (item.item_type === 'offer' && item.status === 'reserved')
      );
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.customer_name.toLowerCase().includes(term) ||
        item.customer_email.toLowerCase().includes(term) ||
        item.title.toLowerCase().includes(term) ||
        item.pickup_code.toLowerCase().includes(term)
      );
    }

    setFilteredPickups(filtered);
    setCurrentPage(1);
  }, [pickups, searchTerm, statusFilter]);

  const handleScanCode = async () => {
    if (!scanCode.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('admin_pickup_by_code', {
        p_code: scanCode.trim()
      });

      if (error) throw error;

      toast({
        title: 'Erfolg',
        description: 'Abholung erfolgreich verbucht',
        variant: 'default',
      });
      
      setScanCode('');
      await fetchPickups();
    } catch (error: any) {
      console.error('Error processing pickup:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Verarbeiten des Codes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (itemId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('admin_cancel_order', {
        p_order_id: itemId
      });

      if (error) throw error;

      toast({
        title: 'Erfolg',
        description: 'Bestellung erfolgreich storniert',
        variant: 'default',
      });
      
      await fetchPickups();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Stornieren der Bestellung',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (item: PickupItem) => {
    if (item.item_type === 'reward') {
      return item.status === 'EINGELÖST' ? 
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Eingelöst</Badge> :
        <Badge variant="success">Abgeholt</Badge>;
    } else {
      switch (item.status) {
        case 'reserved':
          return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Reserviert</Badge>;
        case 'picked_up':
          return <Badge variant="success">Abgeholt</Badge>;
        case 'cancelled':
          return <Badge variant="destructive">Storniert</Badge>;
        default:
          return <Badge variant="outline">{item.status}</Badge>;
      }
    }
  };

  const isPickedUp = (item: PickupItem) => {
    return (item.item_type === 'reward' && item.status === 'ABGEHOLT') ||
           (item.item_type === 'offer' && item.status === 'picked_up');
  };

  const canCancel = (item: PickupItem) => {
    return item.item_type === 'offer' && item.status === 'reserved';
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Lädt...</div>;
  }

  if (!isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Zugriff verweigert</div>;
  }

  const paginatedPickups = filteredPickups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredPickups.length / itemsPerPage);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            asChild
            variant="ghost" 
            size="sm"
            className="flex items-center gap-2"
          >
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Zurück zum Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-heading font-bold">Abholungen</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: 'open' | 'all') => setStatusFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Offen</SelectItem>
              <SelectItem value="all">Alle</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Code Scanner / Eingabe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="QR-Code oder Abholcode eingeben..."
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScanCode()}
              className="flex-1"
            />
            <Button 
              onClick={handleScanCode} 
              disabled={isLoading || !scanCode.trim()}
              className="whitespace-nowrap"
            >
              <Scan className="h-4 w-4 mr-2" />
              Code prüfen
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Abholung-Queue ({filteredPickups.length} Einträge)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Typ</TableHead>
                <TableHead>Titel</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Menge</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPickups.map((item) => (
                <TableRow key={`${item.item_type}-${item.item_id}`}>
                  <TableCell>
                    <Badge variant={item.item_type === 'reward' ? 'secondary' : 'default'}>
                      {item.item_type === 'reward' ? (
                        <><Gift className="h-3 w-3 mr-1" />Reward</>
                      ) : (
                        <><Package className="h-3 w-3 mr-1" />Angebot</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{item.customer_name}</div>
                        <div className="text-sm text-muted-foreground">{item.customer_email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.item_type === 'reward' ? '–' : `${item.qty}x`}
                  </TableCell>
                  <TableCell>{getStatusBadge(item)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {item.pickup_code}
                      </code>
                      <div className="w-8 h-8">
                        <QRCodeSVG value={item.pickup_code} size={32} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.created_at).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPickedUp(item) || isLoading}
                        onClick={() => handleScanCode()}
                        onMouseEnter={() => setScanCode(item.pickup_code)}
                      >
                        Abholen
                      </Button>
                      {canCancel(item) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isLoading}>
                              Stornieren
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Bestellung stornieren</AlertDialogTitle>
                              <AlertDialogDescription>
                                Möchten Sie die Bestellung "{item.title}" wirklich stornieren? 
                                Dies reduziert auch den Restbestand des Angebots.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleCancelOrder(item.item_id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Stornieren
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Seite {currentPage} von {totalPages} ({filteredPickups.length} Einträge)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Zurück
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}