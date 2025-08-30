import { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import OfferFormModal from '@/components/OfferFormModal';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  RefreshCw, 
  Search, 
  Edit, 
  Copy, 
  Eye, 
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Home,
  ArrowLeft,
  Trash2
} from 'lucide-react';

// Helper functions for EUR price handling
const fmtEUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

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

  // Helper functions
  const fmtDE = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  const toastOk = (msg: string) => toast({ title: "Erfolg", description: msg });
  const toastErr = (msg: string) => toast({ title: "Fehler", description: msg, variant: "destructive" });
  
  // Map potential old "created" references to "created_at"
  const mapOfferSort = (k: string) => (k === 'created' ? 'created_at' : k);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const selectFields = `
          id, title, subtitle, description, hero_image_url, 
          price_cents, pickup_date, starts_at, ends_at, 
          limit_total, sold_count, is_active, created_at
        `;
      
      let query = supabase
        .from('offers')
        .select(selectFields, { count: 'exact' });

      // Search filter
      if (searchTerm.trim()) {
        query = query.or(`title.ilike.%${searchTerm}%,subtitle.ilike.%${searchTerm}%`);
      }

      // Sorting
      const [field, direction] = sortBy.split('_');
      const mappedField = mapOfferSort(field);
      query = query.order(mappedField, { ascending: direction === 'asc' });

      console.debug('[OFFERS_QUERY]', { 
        select: selectFields.trim(), 
        orderByUsed: `${mappedField} ${direction === 'asc' ? 'ASC' : 'DESC'}`,
        searchTerm: searchTerm.trim() || 'none',
        originalField: field,
        mappedField 
      });

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
      const duplicatedOffer = {
        title: `[Kopie] ${offer.title}`,
        subtitle: offer.subtitle,
        description: offer.description,
        hero_image_url: offer.hero_image_url,
        price_cents: offer.price_cents,
        pickup_date: offer.pickup_date,
        starts_at: null,
        ends_at: null,
        limit_total: offer.limit_total,
        sold_count: 0,
        is_active: false,
      };

      console.debug('[OFFERS_QUERY]', { 
        select: 'insert operation', 
        orderByUsed: 'none' 
      });

      const { data, error } = await supabase
        .from('offers')
        .insert([duplicatedOffer])
        .select()
        .single();

      if (error) throw error;

      toastOk("Kopie erstellt (inaktiv)");

      // Open editor for the duplicated offer  
      setSelectedOfferId(data.id);
      setModalMode('edit');
      setModalOpen(true);
    } catch (error: any) {
      console.error('Error duplicating offer:', error);
      toastErr("Angebot konnte nicht dupliziert werden.");
    }
  };

  const handleToggleActive = async (offerId: string, currentActive: boolean) => {
    try {
      console.debug('[OFFERS_QUERY]', { 
        select: 'update operation', 
        orderByUsed: 'none' 
      });

      const { error } = await supabase
        .from('offers')
        .update({ is_active: !currentActive })
        .eq('id', offerId);

      if (error) throw error;

      toastOk(`Angebot wurde ${!currentActive ? 'aktiviert' : 'deaktiviert'}.`);
    } catch (error: any) {
      console.error('Error toggling offer status:', error);
      toastErr("Status konnte nicht geändert werden.");
    }
  };

  const handleDelete = async (offerId: string, offerTitle: string) => {
    try {
      console.debug('[OFFERS_QUERY]', { 
        select: 'delete operation', 
        orderByUsed: 'none' 
      });

      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;

      toastOk(`Angebot "${offerTitle}" wurde gelöscht.`);
    } catch (error: any) {
      console.error('Error deleting offer:', error);
      toastErr("Angebot konnte nicht gelöscht werden.");
    }
  };

  const formatDateRange = (starts_at?: string, ends_at?: string) => {
    if (!starts_at && !ends_at) return '-';
    
    if (starts_at && ends_at) {
      return `${fmtDE.format(new Date(starts_at))} → ${fmtDE.format(new Date(ends_at))}`;
    } else if (starts_at) {
      return `ab ${fmtDE.format(new Date(starts_at))}`;
    } else {
      return `bis ${fmtDE.format(new Date(ends_at!))}`;
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
      <div className="p-6" data-ux-version="2025-08-26-ux1">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
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
            <h1 className="text-3xl font-bold">Angebote</h1>
          </div>
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
            <Table data-testid="admin-offers-table">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Titel</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Zeitraum</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Preis</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Limit</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Verkauft</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Rest</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Aktiv</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Updated</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Aktionen</TableHead>
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
                    const remaining = Math.max(0, offer.limit_total - offer.sold_count);
                    return (
                      <TableRow key={offer.id} className="hover:bg-gray-50">
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
                          {fmtEUR.format((offer.price_cents ?? 0) / 100)}
                        </TableCell>
                        <TableCell>{offer.limit_total}</TableCell>
                        <TableCell>{offer.sold_count}</TableCell>
                        <TableCell>
                          {remaining > 0 ? (
                            <span className="text-green-600" data-testid="remaining-value">{remaining}</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700" data-testid="badge-ausverkauft">
                              Ausverkauft
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {offer.is_active ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800" data-testid="badge-aktiv">
                              Aktiv
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800" data-testid="badge-inaktiv">
                              Inaktiv
                            </span>
                          )}
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Angebot löschen</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Sind Sie sicher, dass Sie das Angebot "{offer.title}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDelete(offer.id, offer.title)}
                                  >
                                    Löschen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
          <div className="mt-4 flex items-center justify-end gap-2">
            <div className="text-sm text-muted-foreground mr-4">
              Zeigt {((currentPage - 1) * ITEMS_PER_PAGE) + 1} bis {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} von {totalCount} Angeboten
            </div>
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