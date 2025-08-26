import { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import OfferFormModal from '@/components/OfferFormModal';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  Plus, 
  RefreshCw, 
  Search, 
  Edit, 
  Copy, 
  Eye, 
  EyeOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

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

const ITEMS_PER_PAGE = 25;

export default function AdminOffersPage() {
  const { isAdmin, loading: adminLoading, user } = useAdmin();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedOfferId, setSelectedOfferId] = useState<string>();
  const { toast } = useToast();

  const fetchOffers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('offers')
        .select(`
          id, title, subtitle, description, hero_image_url, 
          price_cents, pickup_date, starts_at, ends_at, 
          limit_total, sold_count, is_active, created_at
        `, { count: 'exact' });

      // Search filter
      if (searchTerm.trim()) {
        query = query.or(`title.ilike.%${searchTerm}%,subtitle.ilike.%${searchTerm}%`);
      }

      // Sorting
      const [field, direction] = sortBy.split('_');
      query = query.order(field, { ascending: direction === 'asc' });

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setOffers(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast({
        title: "Fehler",
        description: "Angebote konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial load and search/sort changes
  useEffect(() => {
    if (isAdmin) {
      fetchOffers();
    }
  }, [isAdmin, searchTerm, sortBy, currentPage]);

  // Realtime subscription
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-offers-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers'
        },
        (payload) => {
          console.log('🔄 Admin offers realtime update:', payload.eventType);
          fetchOffers(); // Refetch to maintain pagination/sorting
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const handleDuplicate = async (offer: Offer) => {
    try {
      const now = new Date();
      const startsAt = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour

      const duplicatedOffer = {
        title: `[Kopie] ${offer.title}`,
        subtitle: offer.subtitle,
        description: offer.description,
        hero_image_url: offer.hero_image_url,
        price_cents: offer.price_cents,
        pickup_date: offer.pickup_date,
        starts_at: startsAt.toISOString(),
        ends_at: null,
        limit_total: offer.limit_total,
        sold_count: 0,
        is_active: false,
      };

      const { data, error } = await supabase
        .from('offers')
        .insert([duplicatedOffer])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Angebot wurde dupliziert.",
      });

      // Open editor for the duplicated offer  
      setSelectedOfferId(data.id);
      setModalMode('edit');
      setModalOpen(true);
    } catch (error: any) {
      console.error('Error duplicating offer:', error);
      toast({
        title: "Fehler",
        description: "Angebot konnte nicht dupliziert werden.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (offerId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: !currentActive })
        .eq('id', offerId);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: `Angebot wurde ${!currentActive ? 'aktiviert' : 'deaktiviert'}.`,
      });
    } catch (error: any) {
      console.error('Error toggling offer status:', error);
      toast({
        title: "Fehler",
        description: "Status konnte nicht geändert werden.",
        variant: "destructive",
      });
    }
  };

  const formatDateRange = (starts_at?: string, ends_at?: string) => {
    if (!starts_at && !ends_at) return '-';
    
    const formatDate = (dateStr: string) => 
      format(new Date(dateStr), 'dd.MM.yyyy HH:mm', { locale: de });
    
    if (starts_at && ends_at) {
      return `${formatDate(starts_at)} → ${formatDate(ends_at)}`;
    } else if (starts_at) {
      return `ab ${formatDate(starts_at)}`;
    } else {
      return `bis ${formatDate(ends_at!)}`;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: de 
    });
  };

  const getRemainingCount = (offer: Offer) => {
    return Math.max(0, offer.limit_total - offer.sold_count);
  };

  // Loading state
  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Berechtigungen werden überprüft...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">403 - Kein Zugriff</h1>
          <p className="text-muted-foreground">Sie haben keine Berechtigung, diese Seite zu besuchen.</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Angebote</h1>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                setModalMode('create');
                setSelectedOfferId(undefined);
                setModalOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Neu
            </Button>
            <Button 
              variant="outline" 
              onClick={() => fetchOffers()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche nach Titel oder Untertitel..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page
              }}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at_desc">Erstellt (Neueste)</SelectItem>
              <SelectItem value="created_at_asc">Erstellt (Älteste)</SelectItem>
              <SelectItem value="starts_at_desc">Start (Neueste)</SelectItem>
              <SelectItem value="starts_at_asc">Start (Älteste)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky top-0 bg-muted/50">Titel</TableHead>
                  <TableHead className="sticky top-0 bg-muted/50">Zeitraum</TableHead>
                  <TableHead className="sticky top-0 bg-muted/50">Preis</TableHead>
                  <TableHead className="sticky top-0 bg-muted/50">Limit</TableHead>
                  <TableHead className="sticky top-0 bg-muted/50">Verkauft</TableHead>
                  <TableHead className="sticky top-0 bg-muted/50">Rest</TableHead>
                  <TableHead className="sticky top-0 bg-muted/50">Aktiv</TableHead>
                  <TableHead className="sticky top-0 bg-muted/50">Updated</TableHead>
                  <TableHead className="sticky top-0 bg-muted/50">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : offers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Keine Angebote gefunden.' : 'Noch keine Angebote vorhanden.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  offers.map((offer) => {
                    const remaining = getRemainingCount(offer);
                    return (
                      <TableRow key={offer.id} className="hover:bg-muted/25">
                        <TableCell>
                          <div>
                            <div className="font-medium">{offer.title}</div>
                            {offer.subtitle && (
                              <div className="text-sm text-muted-foreground">{offer.subtitle}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateRange(offer.starts_at, offer.ends_at)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {(offer.price_cents / 100).toFixed(2)} €
                        </TableCell>
                        <TableCell>{offer.limit_total}</TableCell>
                        <TableCell>{offer.sold_count}</TableCell>
                        <TableCell>
                          {remaining > 0 ? (
                            <span className="text-green-600">{remaining}</span>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              Ausverkauft
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={offer.is_active ? "default" : "secondary"}>
                            {offer.is_active ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatRelativeTime(offer.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOfferId(offer.id);
                                setModalMode('edit');
                                setModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicate(offer)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(offer.id, offer.is_active)}
                            >
                              {offer.is_active ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Zeigt {((currentPage - 1) * ITEMS_PER_PAGE) + 1} bis {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} von {totalCount} Angeboten
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Zurück
              </Button>
              <span className="text-sm">
                Seite {currentPage} von {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Weiter
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Modal */}
        <OfferFormModal
          mode={modalMode}
          offerId={selectedOfferId}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => fetchOffers()}
        />
      </div>
    </div>
  );
}