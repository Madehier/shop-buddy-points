import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import OfferDetailModal from './OfferDetailModal';

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

export default function OffersGrid() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast({
        title: "Fehler beim Laden der Angebote",
        description: "Die Angebote konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();

    // Set up realtime subscription
    const channel = supabase
      .channel('offers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers'
        },
        (payload) => {
          console.log('Offers realtime update:', payload);
          fetchOffers(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getRemainingCount = (offer: Offer) => {
    return Math.max(0, offer.limit_total - offer.sold_count);
  };

  const isOfferDisabled = (offer: Offer) => {
    if (!offer.is_active) return true;
    if (getRemainingCount(offer) <= 0) return true;
    
    const now = new Date();
    if (offer.starts_at && new Date(offer.starts_at) > now) return true;
    if (offer.ends_at && new Date(offer.ends_at) < now) return true;
    
    return false;
  };

  const formatDateChip = (dateString: string) => {
    const date = new Date(dateString);
    const weekday = format(date, 'EEEE', { locale: de });
    const dayMonth = format(date, 'dd.MM');
    return `🔥 ${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${dayMonth}`;
  };

  const handleCardClick = (offer: Offer) => {
    setSelectedOfferId(offer.id);
  };

  const SkeletonCard = () => (
    <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Aktuell sind keine Angebote verfügbar.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map((offer) => {
          const remaining = getRemainingCount(offer);
          const disabled = isOfferDisabled(offer);
          
          return (
            <div
              key={offer.id}
              onClick={() => handleCardClick(offer)}
              className={`
                bg-card rounded-lg shadow-sm border overflow-hidden cursor-pointer
                transition-all duration-200 hover-scale hover:shadow-md
                ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
              `}
            >
              {/* Hero Image with Gradient Overlay */}
              <div className="relative aspect-video overflow-hidden">
                {offer.hero_image_url ? (
                  <img
                    src={offer.hero_image_url}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground">Kein Bild</span>
                  </div>
                )}
                
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
                
                {/* Date chip - top left */}
                {offer.starts_at && (
                  <div className="absolute top-3 left-3">
                    <Badge variant="secondary" className="bg-white/90 text-foreground font-medium">
                      {formatDateChip(offer.starts_at)}
                    </Badge>
                  </div>
                )}
                
                {/* Remaining badge - bottom right */}
                <div className="absolute bottom-3 right-3">
                  <Badge 
                    variant={remaining > 0 ? "default" : "secondary"}
                    className={remaining > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                  >
                    {remaining > 0 ? `Noch ${remaining}` : 'Ausverkauft'}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-2">
                <div>
                  <h3 className="font-semibold text-lg text-foreground leading-tight">
                    {offer.title}
                  </h3>
                  {offer.subtitle && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {offer.subtitle}
                    </p>
                  )}
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xl font-bold text-primary">
                    {(offer.price_cents / 100).toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <OfferDetailModal
        offerId={selectedOfferId}
        onClose={() => setSelectedOfferId(null)}
      />
    </>
  );
}