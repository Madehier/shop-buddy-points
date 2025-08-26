import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { X } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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
        is_active: true,
      });
    }
  }, [mode, offerId, isOpen, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Fehler",
        description: "Titel ist erforderlich.",
        variant: "destructive",
      });
      return;
    }

    if (formData.price_cents < 0) {
      toast({
        title: "Fehler", 
        description: "Preis muss positiv sein.",
        variant: "destructive",
      });
      return;
    }

    if (formData.limit_total < 1) {
      toast({
        title: "Fehler",
        description: "Limit muss mindestens 1 sein.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const offerData = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || null,
        description: formData.description.trim() || null,
        hero_image_url: formData.hero_image_url.trim() || null,
        price_cents: formData.price_cents,
        pickup_date: parseLocalDateTime(formData.pickup_date),
        starts_at: parseLocalDateTime(formData.starts_at),
        ends_at: parseLocalDateTime(formData.ends_at),
        limit_total: formData.limit_total,
        is_active: formData.is_active,
      };

      if (mode === 'create') {
        const { error } = await supabase
          .from('offers')
          .insert([offerData]);

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Angebot wurde erstellt.",
        });
      } else {
        const { error } = await supabase
          .from('offers')
          .update(offerData)
          .eq('id', offerId);

        if (error) throw error;

        toast({
          title: "Erfolg", 
          description: "Angebot wurde aktualisiert.",
        });
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error saving offer:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Speichern.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Angebots-Titel"
                required
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-2">
              <Label htmlFor="subtitle">Untertitel</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => handleInputChange('subtitle', e.target.value)}
                placeholder="Kurzer Untertitel"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detaillierte Beschreibung"
                rows={4}
              />
            </div>

            {/* Hero Image URL */}
            <div className="space-y-2">
              <Label htmlFor="hero_image_url">Hero-Bild URL</Label>
              <Input
                id="hero_image_url"
                type="url"
                value={formData.hero_image_url}
                onChange={(e) => handleInputChange('hero_image_url', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price_cents">Preis (€)</Label>
              <Input
                id="price_cents"
                type="number"
                step="0.01"
                min="0"
                value={(formData.price_cents / 100).toFixed(2)}
                onChange={(e) => handleInputChange('price_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                placeholder="0.00"
              />
            </div>

            {/* Limit Total */}
            <div className="space-y-2">
              <Label htmlFor="limit_total">Verfügbare Menge *</Label>
              <Input
                id="limit_total"
                type="number"
                min="1"
                value={formData.limit_total}
                onChange={(e) => handleInputChange('limit_total', parseInt(e.target.value) || 1)}
                required
              />
            </div>

            {/* Pickup Date */}
            <div className="space-y-2">
              <Label htmlFor="pickup_date">Abholtermin</Label>
              <Input
                id="pickup_date"
                type="datetime-local"
                value={formData.pickup_date}
                onChange={(e) => handleInputChange('pickup_date', e.target.value)}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="starts_at">Verfügbar ab</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => handleInputChange('starts_at', e.target.value)}
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
              />
            </div>

            {/* Active Switch */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is_active">Aktiv</Label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Speichert...' : mode === 'create' ? 'Erstellen' : 'Speichern'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}