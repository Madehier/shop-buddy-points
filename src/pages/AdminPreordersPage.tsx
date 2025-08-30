import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Check, Clock, Package, X } from 'lucide-react';

interface PreorderAdminView {
  preorder_id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  status: 'requested' | 'confirmed' | 'ready' | 'picked_up' | 'cancelled';
  desired_pickup_at: string | null;
  confirmed_pickup_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  created_at: string;
}

interface PreorderItem {
  id: string;
  product_id: string;
  qty_int: number;
  product_name_cache: string;  
}

interface PreorderProduct {
  id: string;
  name: string;
  unit: 'per_100g' | 'per_portion';
}

export default function AdminPreordersPage() {
  const [preorders, setPreorders] = useState<PreorderAdminView[]>([]);
  const [preorderItems, setPreorderItems] = useState<Record<string, PreorderItem[]>>({});
  const [products, setProducts] = useState<PreorderProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [confirmDateTime, setConfirmDateTime] = useState('');
  const [selectedPreorderId, setSelectedPreorderId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    setupRealtimeSubscription();
  }, []);

  const loadData = async () => {
    try {
      // Load preorders
      const { data: preordersData, error: preordersError } = await supabase
        .from('preorders_admin_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (preordersError) throw preordersError;
      setPreorders((preordersData || []) as PreorderAdminView[]);

      // Load items for each preorder
      const { data: itemsData, error: itemsError } = await supabase
        .from('preorder_items')
        .select('*');

      if (itemsError) throw itemsError;

      // Group items by preorder_id
      const itemsByPreorder = (itemsData || []).reduce((acc, item) => {
        if (!acc[item.preorder_id]) {
          acc[item.preorder_id] = [];
        }
        acc[item.preorder_id].push(item);
        return acc;
      }, {} as Record<string, PreorderItem[]>);

      setPreorderItems(itemsByPreorder);

      // Load products for unit info
      const { data: productsData, error: productsError } = await supabase
        .from('preorder_products')
        .select('id, name, unit');

      if (productsError) throw productsError;
      setProducts((productsData || []) as PreorderProduct[]);

    } catch (error) {
      console.error('Error loading preorders:', error);
      toast.error('Fehler beim Laden der Vorbestellungen');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('admin-preorders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'preorders'
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleConfirm = async () => {
    if (!selectedPreorderId || !confirmDateTime) return;

    try {
      const { error } = await supabase.rpc('admin_confirm_preorder', {
        p_preorder_id: selectedPreorderId,
        p_confirmed_at: new Date(confirmDateTime).toISOString()
      });

      if (error) throw error;

      toast.success('Vorbestellung bestätigt');
      setSelectedPreorderId(null);
      setConfirmDateTime('');
      loadData();
    } catch (error) {
      console.error('Error confirming preorder:', error);
      toast.error('Fehler beim Bestätigen');
    }
  };

  const handleMarkReady = async (preorderId: string) => {
    try {
      const { error } = await supabase.rpc('admin_mark_ready_preorder', {
        p_preorder_id: preorderId
      });

      if (error) throw error;
      toast.success('Vorbestellung als bereit markiert');
      loadData();
    } catch (error) {
      console.error('Error marking ready:', error);
      toast.error('Fehler beim Markieren als bereit');
    }
  };

  const handleMarkPickedUp = async (preorderId: string) => {
    try {
      const { error } = await supabase.rpc('admin_mark_picked_up_preorder', {
        p_preorder_id: preorderId
      });

      if (error) throw error;
      toast.success('Vorbestellung als abgeholt markiert');
      loadData();
    } catch (error) {
      console.error('Error marking picked up:', error);
      toast.error('Fehler beim Markieren als abgeholt');
    }
  };

  const handleCancel = async (preorderId: string) => {
    try {
      const { error } = await supabase.rpc('admin_cancel_preorder', {
        p_preorder_id: preorderId
      });

      if (error) throw error;
      toast.success('Vorbestellung storniert');
      loadData();
    } catch (error) {
      console.error('Error cancelling preorder:', error);
      toast.error('Fehler beim Stornieren');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      requested: { label: 'Angefragt', variant: 'secondary' as const },
      confirmed: { label: 'Bestätigt', variant: 'default' as const },
      ready: { label: 'Bereit', variant: 'default' as const },
      picked_up: { label: 'Abgeholt', variant: 'outline' as const },
      cancelled: { label: 'Storniert', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.requested;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatQuantity = (qty: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product?.unit === 'per_100g') {
      return `${qty} g`;
    }
    return `x${qty}`;
  };

  const filteredPreorders = preorders.filter(preorder => {
    const matchesSearch = searchTerm === '' || 
      preorder.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preorder.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preorder.preorder_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || preorder.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex justify-center p-8">Lädt...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Vorbestellungen</h1>
      </div>

      {/* Filterleiste */}
      <Card>
        <CardContent className="flex flex-col md:flex-row gap-4 p-4">
          <div className="flex-1">
            <Input
              placeholder="Suche nach Name, E-Mail oder ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="requested">Angefragt</SelectItem>
              <SelectItem value="confirmed">Bestätigt</SelectItem>
              <SelectItem value="ready">Bereit</SelectItem>
              <SelectItem value="picked_up">Abgeholt</SelectItem>
              <SelectItem value="cancelled">Storniert</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Vorbestellungen Liste */}
      <div className="space-y-4">
        {filteredPreorders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Keine Vorbestellungen gefunden</p>
            </CardContent>
          </Card>
        ) : (
          filteredPreorders.map((preorder) => (
            <Card key={preorder.preorder_id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Hauptinfo */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground">
                        #{preorder.preorder_id.slice(0, 8)}
                      </span>
                      {getStatusBadge(preorder.status)}
                    </div>
                    
                    <div>
                      <div className="font-medium">{preorder.customer_name}</div>
                      <div className="text-sm text-muted-foreground">{preorder.customer_email}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Wunschzeit: </span>
                        {preorder.desired_pickup_at 
                          ? format(new Date(preorder.desired_pickup_at), 'PPpp', { locale: de })
                          : 'Nicht angegeben'}
                      </div>
                      
                      {preorder.confirmed_pickup_at && (
                        <div>
                          <span className="font-medium">Bestätigt für: </span>
                          {format(new Date(preorder.confirmed_pickup_at), 'PPpp', { locale: de })}
                        </div>
                      )}
                      
                      {preorder.ready_at && (
                        <div>
                          <span className="font-medium">Bereit seit: </span>
                          {format(new Date(preorder.ready_at), 'PPpp', { locale: de })}
                        </div>
                      )}
                      
                      {preorder.picked_up_at && (
                        <div>
                          <span className="font-medium">Abgeholt: </span>
                          {format(new Date(preorder.picked_up_at), 'PPpp', { locale: de })}
                        </div>
                      )}
                    </div>

                    <div className="text-sm">
                      <span className="font-medium">Artikel: </span>
                      {preorderItems[preorder.preorder_id]?.map((item, idx) => (
                        <span key={item.id}>
                          {idx > 0 && ' · '}
                          {item.product_name_cache} {formatQuantity(item.qty_int, item.product_id)}
                        </span>
                      )) || 'Keine Artikel'}
                    </div>
                  </div>

                  {/* Aktionen */}
                  <div className="flex flex-row lg:flex-col gap-2">
                    {preorder.status === 'requested' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            onClick={() => setSelectedPreorderId(preorder.preorder_id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Bestätigen
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Vorbestellung bestätigen</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="confirm-datetime">Bestätigte Abholzeit</Label>
                              <Input
                                id="confirm-datetime"
                                type="datetime-local"
                                value={confirmDateTime}
                                onChange={(e) => setConfirmDateTime(e.target.value)}
                                min={new Date().toISOString().slice(0, 16)}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleConfirm} className="flex-1">
                                Bestätigen
                              </Button>
                              <Button variant="outline" onClick={() => {
                                setSelectedPreorderId(null);
                                setConfirmDateTime('');
                              }}>
                                Abbrechen
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {(preorder.status === 'confirmed') && (
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleMarkReady(preorder.preorder_id)}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Bereit
                      </Button>
                    )}

                    {(preorder.status === 'ready' || preorder.status === 'confirmed') && (
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleMarkPickedUp(preorder.preorder_id)}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Abgeholt
                      </Button>
                    )}

                    {!['picked_up', 'cancelled'].includes(preorder.status) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <X className="h-4 w-4 mr-1" />
                            Stornieren
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Vorbestellung stornieren</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sind Sie sicher, dass Sie diese Vorbestellung stornieren möchten? 
                              Diese Aktion kann nicht rückgängig gemacht werden.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleCancel(preorder.preorder_id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Stornieren
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}