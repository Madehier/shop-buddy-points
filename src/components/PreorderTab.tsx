import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface PreorderProduct {
  id: string;
  name: string;
  unit: 'per_100g' | 'per_portion';
  step_int: number;
  is_active: boolean;
}

interface PreorderItem {
  id: string;
  product_id: string;
  qty_int: number;
  product_name_cache: string;
}

interface Preorder {
  id: string;
  status: 'requested' | 'confirmed' | 'ready' | 'picked_up' | 'cancelled';
  desired_pickup_at: string | null;
  confirmed_pickup_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  created_at: string;
  preorder_items: PreorderItem[];
}

export function PreorderTab() {
  const [products, setProducts] = useState<PreorderProduct[]>([]);
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [desiredPickupAt, setDesiredPickupAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    setupRealtimeSubscription();
  }, []);

  const loadData = async () => {
    try {
      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from('preorder_products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (productsError) throw productsError;
      setProducts((productsData || []) as PreorderProduct[]);

      // Load user preorders with items
      const { data: preordersData, error: preordersError } = await supabase
        .from('preorders')
        .select(`
          *,
          preorder_items (*)
        `)
        .order('created_at', { ascending: false });

      if (preordersError) throw preordersError;
      setPreorders((preordersData || []) as Preorder[]);
    } catch (error) {
      console.error('Error loading preorder data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('preorders-changes')
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

  const updateQuantity = (productId: string, change: number, product: PreorderProduct) => {
    const current = quantities[productId] || 0;
    const step = product.unit === 'per_100g' ? product.step_int : 1;
    const newValue = Math.max(0, current + (change * step));
    
    setQuantities(prev => ({
      ...prev,
      [productId]: newValue
    }));
  };

  const handleSubmit = async () => {
    if (!desiredPickupAt) {
      toast.error('Bitte wählen Sie eine Abholzeit');
      return;
    }

    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => ({
        product_id: productId,
        qty_int: qty
      }));

    if (items.length === 0) {
      toast.error('Bitte mindestens einen Artikel auswählen');
      return;
    }

    setSubmitting(true);
    
    try {
      const { error } = await supabase.rpc('create_preorder', {
        p_desired: new Date(desiredPickupAt).toISOString(),
        p_items: items
      });

      if (error) {
        if (error.message.includes('must be multiple of')) {
          toast.error('Menge muss ein Vielfaches von 100 g sein');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Vorbestellung eingegangen');
      setQuantities({});
      setDesiredPickupAt('');
      loadData();
    } catch (error) {
      console.error('Error creating preorder:', error);
      toast.error('Fehler beim Erstellen der Vorbestellung');
    } finally {
      setSubmitting(false);
    }
  };

  const formatQuantity = (qty: number, unit: string) => {
    if (unit === 'per_100g') {
      return `${qty} g`;
    }
    return `x${qty}`;
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

  if (loading) {
    return <div className="flex justify-center p-8">Lädt...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Neue Vorbestellung */}
      <Card>
        <CardHeader>
          <CardTitle>Neue Vorbestellung</CardTitle>
          <CardDescription>
            Wählen Sie Ihre gewünschten Produkte und Abholzeit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Produkte */}
          <div className="grid gap-4 md:grid-cols-2">
            {products.map((product) => (
              <Card key={product.id} className="p-4">
                <div className="flex flex-col space-y-3">
                  <div>
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {product.unit === 'per_100g' 
                        ? 'Menge (in Gramm, Schritte á 100 g)' 
                        : 'Portionen'}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(product.id, -1, product)}
                      disabled={!quantities[product.id]}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    
                    <span className="min-w-[60px] text-center font-medium">
                      {formatQuantity(quantities[product.id] || 0, product.unit)}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(product.id, 1, product)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Abholzeit */}
          <div className="space-y-2">
            <Label htmlFor="pickup-time">Gewünschte Abholzeit</Label>
            <Input
              id="pickup-time"
              type="datetime-local"
              value={desiredPickupAt}
              onChange={(e) => setDesiredPickupAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {/* Bestellen Button */}
          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="w-full"
          >
            {submitting ? 'Wird bestellt...' : 'Bestellen'}
          </Button>
        </CardContent>
      </Card>

      {/* Meine Vorbestellungen */}
      <Card>
        <CardHeader>
          <CardTitle>Meine Vorbestellungen</CardTitle>
        </CardHeader>
        <CardContent>
          {preorders.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Keine Vorbestellungen vorhanden
            </p>
          ) : (
            <div className="space-y-4">
              {preorders.map((preorder) => (
                <Card key={preorder.id} className="p-4">
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        #{preorder.id.slice(0, 8)}
                      </div>
                      {getStatusBadge(preorder.status)}
                    </div>
                    
                    <div className="grid gap-2 text-sm">
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
                      
                      <div>
                        <span className="font-medium">Artikel: </span>
                        {preorder.preorder_items.map((item, idx) => (
                          <span key={item.id}>
                            {idx > 0 && ' · '}
                            {item.product_name_cache} {formatQuantity(item.qty_int, 
                              products.find(p => p.id === item.product_id)?.unit || 'per_portion'
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}