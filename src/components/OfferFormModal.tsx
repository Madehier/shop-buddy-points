import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';  
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { X, Upload } from 'lucide-react';

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

interface OfferFormModalProps {
  mode: 'create' | 'edit';
  offerId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const formatDateTimeLocal = (dateString?: string) => {
  if (!dateString) return '';
  return format(new Date(dateString), "yyyy-MM-dd'T'HH:mm");
};

const parseLocalDateTime = (localDateTime: string) => {
  if (!localDateTime) return null;
  return new Date(localDateTime).toISOString();
};

export default function OfferFormModal({ 
  mode, 
  offerId, 
  isOpen, 
  onClose, 
  onSuccess 
}: OfferFormModalProps) {
  const { isAdmin, loading: adminLoading, user } = useAdmin();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Helper functions
  const toISO = (v: string) => (v ? new Date(v).toISOString() : null);
  const fmtDE = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  const toastOk = (msg: string) => toast({ title: "Erfolg", description: msg });
  const toastErr = (msg: string) => toast({ title: "Fehler", description: msg, variant: "destructive" });

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    hero_image_url: '',
    price_cents: 0,
    pickup_date: '',
    starts_at: '',
    ends_at: '',
    limit_total: 1,
    sold_count: 0,
    is_active: true,
  });

  // Load offer data for edit mode
  useEffect(() => {
    if (mode === 'edit' && offerId && isOpen) {
      const loadOffer = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('offers')
            .select('*')
            .eq('id', offerId)
            .single();

          if (error) throw error;

          setFormData({
            title: data.title || '',
            subtitle: data.subtitle || '',
            description: data.description || '',
            hero_image_url: data.hero_image_url || '',
            price_cents: data.price_cents || 0,
            pickup_date: formatDateTimeLocal(data.pickup_date),
            starts_at: formatDateTimeLocal(data.starts_at),
            ends_at: formatDateTimeLocal(data.ends_at),
            limit_total: data.limit_total || 1,
            sold_count: data.sold_count || 0,
            is_active: data.is_active || false,
          });
        } catch (error) {
          console.error('Error loading offer:', error);
          toast({
            title: "Fehler",
            description: "Angebot konnte nicht geladen werden.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };

      loadOffer();
    } else if (mode === 'create' && isOpen) {
      // Reset form for create mode
      setFormData({
        title: '',
        subtitle: '',
        description: '',
        hero_image_url: '',
        price_cents: 0,
        pickup_date: '',
        starts_at: '',
        ends_at: '',
        limit_total: 1,
        sold_count: 0,
        is_active: true,
      });
    }
  }, [mode, offerId, isOpen, toast]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie eine Bilddatei aus.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fehler",
        description: "Bildgröße darf 5MB nicht überschreiten.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `offers/${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('offers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('offers')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, hero_image_url: publicUrl }));

      toast({
        title: "Erfolg",
        description: "Bild wurde hochgeladen.",
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toastErr("Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toastErr("Eingabe prüfen");
      return false;
    }

    if (formData.title.length > 120) {
      toastErr("Eingabe prüfen");
      return false;
    }

    if (formData.subtitle && formData.subtitle.length > 160) {
      toastErr("Eingabe prüfen");
      return false;
    }

    if (formData.price_cents < 0) {
      toastErr("Eingabe prüfen");
      return false;
    }

    if (formData.limit_total < 0) {
      toastErr("Eingabe prüfen");
      return false;
    }

    // Validate date range
    if (formData.starts_at && formData.ends_at) {
      const startDate = new Date(formData.starts_at);
      const endDate = new Date(formData.ends_at);
      if (endDate <= startDate) {
        toastErr("Eingabe prüfen");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const offerData = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || null,
        description: formData.description.trim() || null,
        hero_image_url: formData.hero_image_url.trim() || null,
        price_cents: formData.price_cents,
        pickup_date: toISO(formData.pickup_date),
        starts_at: toISO(formData.starts_at),
        ends_at: toISO(formData.ends_at),
        limit_total: formData.limit_total,
        is_active: formData.is_active,
      };

      if (mode === 'create') {
        const { error } = await supabase
          .from('offers')
          .insert([offerData]);

        if (error) throw error;

        toastOk("Gespeichert");
      } else {
        const { error } = await supabase
          .from('offers')
          .update(offerData)
          .eq('id', offerId);

        if (error) throw error;

        toastOk("Gespeichert");
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error saving offer:', error);
      toastErr(error.message || "Fehler beim Speichern.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Access control
  if (adminLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isAdmin) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl">
          <div className="text-center py-8">
            <h2 className="text-xl font-bold text-destructive mb-2">403 - Kein Zugriff</h2>
            <p className="text-muted-foreground">Sie haben keine Berechtigung für diese Aktion.</p>
            <Button onClick={onClose} className="mt-4">Schließen</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const remainingCount = Math.max(0, formData.limit_total - formData.sold_count);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl w-full p-6" data-ux-version="2025-08-26-ux1" data-testid="offer-form-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {mode === 'create' ? 'Neues Angebot' : 'Angebot bearbeiten'}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">
                  Titel * 
                  <span className="text-xs text-muted-foreground ml-1">
                    ({formData.title.length}/120)
                  </span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Angebots-Titel"
                  maxLength={120}
                  required
                  data-testid="input-title"
                />
              </div>

              {/* Subtitle */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="subtitle">
                  Untertitel 
                  <span className="text-xs text-muted-foreground ml-1">
                    ({formData.subtitle.length}/160)
                  </span>
                </Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => handleInputChange('subtitle', e.target.value)}
                  placeholder="Kurzer Untertitel"
                  maxLength={160}
                />
              </div>

              {/* Description */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Detaillierte Beschreibung (Markdown unterstützt)"
                  rows={4}
                />
              </div>

              {/* Hero Image */}
              <div className="space-y-2 md:col-span-2">
                <Label>Hero-Bild</Label>
                
                {/* Image Preview */}
                {formData.hero_image_url && (
                  <img
                    src={formData.hero_image_url}
                    alt=""
                    className="aspect-video w-full rounded-lg object-cover"
                  />
                )}

                <div className="flex gap-2">
                  {/* Upload Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('hero-upload')?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2"
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {uploading ? 'Lädt hoch...' : 'Bild hochladen'}
                  </Button>

                  <input
                    id="hero-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {/* URL Input */}
                  <Input
                    placeholder="Oder Bild-URL eingeben"
                    value={formData.hero_image_url}
                    onChange={(e) => handleInputChange('hero_image_url', e.target.value)}
                    className="flex-1"
                    data-testid="input-hero-url"
                  />
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="price_cents">Preis (€)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="price_cents"
                    type="number"
                    step="0.01"
                    min="0"
                    value={(formData.price_cents / 100).toFixed(2)}
                    onChange={(e) => handleInputChange('price_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                    placeholder="0.00"
                    className="flex-1"
                    data-testid="input-price-cents"
                  />
                  <span className="text-sm text-muted-foreground">
                    = {formData.price_cents} Cent
                  </span>
                </div>
              </div>

              {/* Limit Total */}
              <div className="space-y-2">
                <Label htmlFor="limit_total">Verfügbare Menge *</Label>
                <Input
                  id="limit_total"
                  type="number"
                  min="0"
                  value={formData.limit_total}
                  onChange={(e) => handleInputChange('limit_total', parseInt(e.target.value) || 0)}
                  required
                  data-testid="input-limit-total"
                />
              </div>

              {/* Readonly Fields (Edit Mode) */}
              {mode === 'edit' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Verkauft</Label>
                    <div className="text-lg font-semibold" data-testid="sold-count">{formData.sold_count}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Verbleibend</Label>
                    <div className="text-lg font-semibold" data-testid="remaining-value">{Math.max(0, formData.limit_total - formData.sold_count)}</div>
                  </div>
                </>
              )}

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="starts_at">Verfügbar ab</Label>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => handleInputChange('starts_at', e.target.value)}
                  data-testid="input-starts-at"
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="ends_at">Verfügbar bis</Label>
                <Input
                  id="ends_at"
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) => handleInputChange('ends_at', e.target.value)}
                  data-testid="input-ends-at"
                />
              </div>

              {/* Pickup Date */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="pickup_date">Abholtermin</Label>
                <Input
                  id="pickup_date"
                  type="datetime-local"
                  value={formData.pickup_date}
                  onChange={(e) => handleInputChange('pickup_date', e.target.value)}
                />
              </div>

              {/* Active Switch */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active">Aktiv</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Aktiv macht das Angebot sofort sichtbar, sofern es im Zeitfenster liegt.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                aria-busy={isSubmitting}
                className="flex-1"
                data-testid="btn-save-offer"
              >
                {isSubmitting ? 'Speichert...' : mode === 'create' ? 'Erstellen' : 'Speichern'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}