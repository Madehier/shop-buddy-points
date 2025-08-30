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
import PreorderProductFormModal from '@/components/PreorderProductFormModal';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  RefreshCw, 
  Search, 
  Edit, 
  Copy, 
  Eye, 
  EyeOff,
  Trash2,
  ArrowLeft
} from 'lucide-react';

const fmtEUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

interface PreorderProduct {
  id: string;
  name: string;
  description?: string;
  unit: string;
  step_int: number;
  price_cents?: number;
  avg_lead_time_minutes?: number;
  photo_url?: string;
  is_active: boolean;
  created_at: string;
}

const ITEMS_PER_PAGE = 25;

export default function AdminPreorderProductsPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [products, setProducts] = useState<PreorderProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedProductId, setSelectedProductId] = useState<string>();
  const { toast } = useToast();

  const toastOk = (msg: string) => toast({ title: "Erfolg", description: msg });
  const toastErr = (msg: string) => toast({ title: "Fehler", description: msg, variant: "destructive" });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('preorder_products')
        .select('*', { count: 'exact' });

      // Search filter
      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Sorting
      query = query.order('created_at', { ascending: false });

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setProducts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching products:', error);
      toastErr("Produkte konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  // Initial load and search changes
  useEffect(() => {
    if (isAdmin) {
      fetchProducts();
    }
  }, [isAdmin, searchTerm, currentPage]);

  // Realtime subscription
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-preorder-products-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'preorder_products'
        },
        (payload) => {
          console.log('🔄 Admin preorder products realtime update:', payload.eventType);
          fetchProducts(); // Refetch to maintain pagination/sorting
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const handleDuplicate = async (product: PreorderProduct) => {
    try {
      const duplicatedProduct = {
        name: `[Kopie] ${product.name}`,
        description: product.description,
        unit: product.unit,
        step_int: product.step_int,
        price_cents: product.price_cents,
        avg_lead_time_minutes: product.avg_lead_time_minutes,
        photo_url: product.photo_url,
        is_active: false,
      };

      const { data, error } = await supabase
        .from('preorder_products')
        .insert([duplicatedProduct])
        .select()
        .single();

      if (error) throw error;

      toastOk("Kopie erstellt (inaktiv)");

      // Open editor for the duplicated product  
      setSelectedProductId(data.id);
      setModalMode('edit');
      setModalOpen(true);
    } catch (error: any) {
      console.error('Error duplicating product:', error);
      toastErr("Produkt konnte nicht dupliziert werden.");
    }
  };

  const handleToggleActive = async (productId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('preorder_products')
        .update({ is_active: !currentActive })
        .eq('id', productId);

      if (error) throw error;

      toastOk(`Produkt wurde ${!currentActive ? 'aktiviert' : 'deaktiviert'}.`);
    } catch (error: any) {
      console.error('Error toggling product status:', error);
      toastErr("Status konnte nicht geändert werden.");
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    try {
      const { error } = await supabase
        .from('preorder_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toastOk(`Produkt "${productName}" wurde gelöscht.`);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toastErr("Produkt konnte nicht gelöscht werden.");
    }
  };

  const formatLeadTime = (minutes?: number) => {
    if (!minutes) return '-';
    if (minutes < 60) return `~ ${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `~ ${hours} Std.`;
    return `~ ${hours} Std. ${remainingMinutes} Min.`;
  };

  const getUnitBadge = (unit: string) => {
    switch (unit) {
      case 'per_100g':
        return <Badge variant="secondary">pro 100 g</Badge>;
      case 'per_portion':
        return <Badge variant="outline">pro Portion</Badge>;
      default:
        return <Badge>{unit}</Badge>;
    }
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
      <div className="p-6">
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
            <h1 className="text-3xl font-bold">Vorbestell-Produkte</h1>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                setModalMode('create');
                setSelectedProductId(undefined);
                setModalOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Neu
            </Button>
            <Button 
              variant="outline" 
              onClick={() => fetchProducts()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche nach Name oder Beschreibung..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Bild</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Produkt</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Einheit</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Schrittweite</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Preis</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Ø Vorlaufzeit</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Aktiv</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Keine Produkte gefunden.' : 'Noch keine Produkte vorhanden.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id} className="hover:bg-gray-50">
                      <TableCell>
                        {product.photo_url ? (
                          <img 
                            src={product.photo_url} 
                            alt={product.name}
                            className="w-14 h-14 rounded object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                            Kein Bild
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">{product.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getUnitBadge(product.unit)}
                      </TableCell>
                      <TableCell>{product.step_int}</TableCell>
                      <TableCell className="font-medium">
                        {product.price_cents ? fmtEUR.format(product.price_cents / 100) : '-'}
                      </TableCell>
                      <TableCell>
                        {formatLeadTime(product.avg_lead_time_minutes)}
                      </TableCell>
                      <TableCell>
                        {product.is_active ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Aktiv
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Inaktiv
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProductId(product.id);
                              setModalMode('edit');
                              setModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(product)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(product.id, product.is_active)}
                          >
                            {product.is_active ? (
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
                                <AlertDialogTitle>Produkt löschen</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Sind Sie sicher, dass Sie das Produkt "{product.name}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(product.id, product.name)}
                                >
                                  Löschen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2">
            <div className="text-sm text-muted-foreground mr-4">
              Zeigt {((currentPage - 1) * ITEMS_PER_PAGE) + 1} bis {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} von {totalCount} Produkten
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Zurück
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Weiter
            </Button>
          </div>
        )}

        {/* Modal */}
        <PreorderProductFormModal
          mode={modalMode}
          productId={selectedProductId}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            fetchProducts();
          }}
        />
      </div>
    </div>
  );
}