import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, LogIn } from 'lucide-react';

interface Offer {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  hero_image_url?: string;
  price_cents: number;
  pickup_date?: string;
  starts_at?: string;
  ends_at?: string;
  limit_total: number;
  sold_count: number;
  is_active: boolean;
}

interface OfferDetailModalProps {
  offerId: string | null;
  onClose: () => void;
}

export default function OfferDetailModal({ offerId, onClose }: OfferDetailModalProps) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { user } = useAuth();
  const { toast } = useToast();

  const isOpen = Boolean(offerId);

  // Fetch offer data
  useEffect(() => {
    if (!offerId) {
      setOffer(null);
      return;
    }

    const fetchOffer = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('id, title, subtitle, description, hero_image_url, price_cents, limit_total, sold_count, pickup_date, starts_at, ends_at, is_active')
          .eq('id', offerId)
          .single();

        if (error) throw error;
        setOffer(data);
      } catch (error) {
        console.error('Error fetching offer:', error);
        toast({
          title: "Fehler",
          description: "Das Angebot konnte nicht geladen werden.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();

    // Set up realtime subscription for sold_count updates
    const channel = supabase
      .channel(`offer-${offerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'offers',
          filter: `id=eq.${offerId}`
        },
        (payload) => {
          console.log('Offer realtime update:', payload);
          if (payload.new) {
            setOffer(prev => prev ? { ...prev, sold_count: payload.new.sold_count } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [offerId, toast]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-lg rounded-2xl">
          <div className="absolute right-4 top-4">
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4 pt-8">
            <div className="animate-pulse space-y-4">
              <div className="bg-muted h-48 rounded-t-2xl" />
              <div className="space-y-2">
                <div className="bg-muted h-6 w-3/4 rounded" />
                <div className="bg-muted h-4 w-1/2 rounded" />
                <div className="bg-muted h-20 w-full rounded" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!offer) return null;

  const remaining = Math.max(0, offer.limit_total - offer.sold_count);
  const maxQuantity = Math.min(5, remaining);
  
  const isDisabled = !offer.is_active || remaining <= 0 || 
    (offer.starts_at && new Date(offer.starts_at) > new Date()) ||
    (offer.ends_at && new Date(offer.ends_at) < new Date());

  const handlePurchase = async () => {
    if (!user) return;
    
    try {
      setPurchasing(true);
      
      const { data, error } = await supabase.rpc('purchase_offer', {
        p_offer_id: offer.id,
        p_qty: quantity
      });

      if (error) throw error;

      const result = data[0];
      toast({
        title: "Reservierung erfolgreich!",
        description: `Bestellnummer: ${result.order_id}. Noch ${result.remaining} übrig.`,
      });
      
      onClose();
    } catch (error: any) {
      console.error('Purchase error:', error);
      
      let errorMessage = "Ein Fehler ist aufgetreten.";
      if (error.message?.includes('sold out')) {
        errorMessage = "Leider ausverkauft";
      } else if (error.message?.includes('not available')) {
        errorMessage = "Angebot nicht verfügbar";
      }
      
      toast({
        title: "Reservierung fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleLogin = async () => {
    // Trigger Supabase Auth UI (you might want to implement this differently based on your auth setup)
    window.location.href = '/auth';
  };

  const formatPickupDate = (dateString: string) => {
    return format(new Date(dateString), "dd.MM.yyyy HH:mm", { locale: de });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg rounded-2xl p-0 gap-0">
        {/* Close Button */}
        <div className="absolute right-4 top-4 z-10">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-white/80 hover:bg-white">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-0">
          {/* Hero Image */}
          {offer.hero_image_url ? (
            <div className="relative aspect-video overflow-hidden rounded-t-2xl">
              <img
                src={offer.hero_image_url}
                alt={offer.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-t-2xl flex items-center justify-center">
              <span className="text-muted-foreground">Kein Bild verfügbar</span>
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Title & Subtitle */}
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">{offer.title}</h2>
              {offer.subtitle && (
                <p className="text-muted-foreground">{offer.subtitle}</p>
              )}
            </div>

            {/* Description */}
            {offer.description && (
              <div className="text-sm text-muted-foreground leading-relaxed">
                {offer.description}
              </div>
            )}

            {/* Price & Pickup */}
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">
                {(offer.price_cents / 100).toFixed(2)} €
              </div>
              {offer.pickup_date && (
                <p className="text-sm text-muted-foreground">
                  Abholung am {formatPickupDate(offer.pickup_date)}
                </p>
              )}
            </div>

            {/* Availability Badge */}
            <Badge 
              variant={remaining > 0 ? "default" : "destructive"}
              className="text-sm"
            >
              {remaining > 0 ? `Noch ${remaining} verfügbar` : 'Ausverkauft'}
            </Badge>

            {/* Auth Gate or Order Section */}
            {!user ? (
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground text-center">
                  Bitte einloggen, um zu bestellen
                </p>
                <Button onClick={handleLogin} className="w-full" size="lg">
                  <LogIn className="w-4 h-4 mr-2" />
                  Einloggen
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {/* Quantity Selector */}
                {!isDisabled && remaining > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Menge</label>
                    <Select 
                      value={quantity.toString()} 
                      onValueChange={(value) => setQuantity(parseInt(value))}
                      disabled={maxQuantity < 1}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Purchase Button */}
                <Button
                  onClick={handlePurchase}
                  disabled={isDisabled || purchasing || maxQuantity < 1}
                  className="w-full"
                  size="lg"
                >
                  {purchasing ? 'Wird reserviert...' : 
                   isDisabled ? 'Nicht verfügbar' : 
                   `Zur Abholung reservieren`}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}