import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Package, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';

interface PickupItem {
  type: 'reward' | 'offer';
  id: string;
  title: string;
  description?: string;
  qty: number;
  points?: number;
  pickup_code: string;
  created_at: string;
  status: string;
}

interface PickupsListProps {
  userId: string;
  onRefresh?: () => void;
}

export function PickupsList({ userId, onRefresh }: PickupsListProps) {
  const [pickups, setPickups] = useState<PickupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPickups();
  }, [userId]);

  const fetchPickups = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Fetch reward claims (eingelöst status)
      const { data: claims, error: claimsError } = await supabase
        .from('claims')
        .select('*')
        .eq('customer_id', userId)
        .eq('status', 'EINGELÖST')
        .order('created_at', { ascending: false });

      if (claimsError) throw claimsError;

      // Fetch reserved orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          offers (
            title,
            description
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'reserved')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Combine both types into unified pickup items
      const rewardPickups: PickupItem[] = (claims || []).map(claim => ({
        type: 'reward' as const,
        id: claim.id,
        title: claim.reward_name,
        description: claim.reward_description,
        qty: 1,
        points: claim.points_redeemed,
        pickup_code: claim.qr_code,
        created_at: claim.created_at,
        status: claim.status
      }));

      const orderPickups: PickupItem[] = (orders || []).map(order => ({
        type: 'offer' as const,
        id: order.id,
        title: order.offers?.title || 'Angebot',
        description: order.offers?.description,
        qty: order.qty,
        pickup_code: `order_${order.id}`,
        created_at: order.created_at,
        status: order.status
      }));

      // Sort by creation date, newest first
      const allPickups = [...rewardPickups, ...orderPickups].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setPickups(allPickups);
    } catch (error) {
      console.error('Error fetching pickups:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Lädt Abholungen...</p>
      </div>
    );
  }

  if (pickups.length === 0) {
    return (
      <div className="text-center py-8">
        <QrCode className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Keine Abholungen verfügbar</p>
        <p className="text-sm text-muted-foreground mt-2">
          Lösen Sie Belohnungen ein oder bestellen Sie Angebote
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pickups.map((pickup) => (
        <Card key={`${pickup.type}-${pickup.id}`} className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {pickup.type === 'reward' ? (
                    <Gift className="h-4 w-4 text-primary" />
                  ) : (
                    <Package className="h-4 w-4 text-primary" />
                  )}
                  <h3 className="font-semibold">{pickup.title}</h3>
                </div>
                
                {pickup.description && (
                  <p className="text-sm text-muted-foreground mb-2">{pickup.description}</p>
                )}
                
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={pickup.type === 'reward' ? 'secondary' : 'default'}>
                    {pickup.type === 'reward' ? 'Belohnung' : 'Angebot'}
                  </Badge>
                  
                  {pickup.type === 'reward' && pickup.points && (
                    <Badge variant="outline">
                      {pickup.points} Punkte eingelöst
                    </Badge>
                  )}
                  
                  {pickup.type === 'offer' && (
                    <Badge variant="outline">
                      {pickup.qty}x bestellt
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mt-2">
                  Erstellt: {new Date(pickup.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-2 rounded-lg border-2 border-primary/20">
                  <QRCodeSVG 
                    value={pickup.pickup_code} 
                    size={80}
                    fgColor="#2563eb"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  An der Kasse scannen lassen
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}