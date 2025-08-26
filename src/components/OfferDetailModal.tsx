import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, Package, MapPin } from 'lucide-react';

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
  created_at: string;
}

interface OfferDetailModalProps {
  offer: Offer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OfferDetailModal({ offer, open, onOpenChange }: OfferDetailModalProps) {
  const [purchasing, setPurchasing] = useState(false);
  const { toast } = useToast();

  if (!offer) return null;

  const remaining = Math.max(0, offer.limit_total - offer.sold_count);
  const isDisabled = !offer.is_active || remaining <= 0 || 
    (offer.starts_at && new Date(offer.starts_at) > new Date()) ||
    (offer.ends_at && new Date(offer.ends_at) < new Date());

  const handlePurchase = async () => {
    try {
      setPurchasing(true);
      
      const { data, error } = await supabase.rpc('purchase_offer', {
        p_offer_id: offer.id,
        p_qty: 1
      });

      if (error) throw error;

      toast({
        title: "Erfolgreich reserviert!",
        description: "Ihr Angebot wurde erfolgreich reserviert.",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Purchase error:', error);
      
      let errorMessage = "Ein Fehler ist aufgetreten.";
      if (error.message?.includes('sold out')) {
        errorMessage = "Das Angebot ist leider ausverkauft.";
      } else if (error.message?.includes('not available')) {
        errorMessage = "Das Angebot ist nicht verfügbar.";
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

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "EEEE, dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd.MM.yyyy", { locale: de });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{offer.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Hero Image */}
          {offer.hero_image_url && (
            <div className="relative aspect-video overflow-hidden rounded-lg">
              <img
                src={offer.hero_image_url}
                alt={offer.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          )}

          {/* Key Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="w-4 h-4" />
                <span>Verfügbar</span>
              </div>
              <Badge 
                variant={remaining > 0 ? "default" : "secondary"}
                className="text-sm"
              >
                {remaining > 0 ? `Noch ${remaining} verfügbar` : 'Ausverkauft'}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Preis</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {(offer.price_cents / 100).toFixed(2)} €
              </div>
            </div>
          </div>

          {/* Subtitle */}
          {offer.subtitle && (
            <div>
              <p className="text-muted-foreground">{offer.subtitle}</p>
            </div>
          )}

          <Separator />

          {/* Timing Information */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Zeitraum
            </h3>
            
            <div className="space-y-2 text-sm">
              {offer.starts_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Verfügbar ab:</span>
                  <span>{formatDateTime(offer.starts_at)}</span>
                </div>
              )}
              
              {offer.ends_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Verfügbar bis:</span>
                  <span>{formatDateTime(offer.ends_at)}</span>
                </div>
              )}
              
              {offer.pickup_date && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Abholung am:</span>
                  <span>{formatDate(offer.pickup_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {offer.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Beschreibung</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {offer.description}
                </p>
              </div>
            </>
          )}

          {/* Action Button */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handlePurchase}
              disabled={isDisabled || purchasing}
              className="flex-1"
              size="lg"
            >
              {purchasing ? 'Wird reserviert...' : 
               isDisabled ? 'Nicht verfügbar' : 
               `Reservieren für ${(offer.price_cents / 100).toFixed(2)} €`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}