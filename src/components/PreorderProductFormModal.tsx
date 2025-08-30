import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';  
import { useToast } from '@/hooks/use-toast';
import { Upload, X } from 'lucide-react';

// Helper function for EUR price handling
function parseEURToCents(input: string): number | null {
  const cleanInput = input.replace(/[^\d.,]/g, '').replace(',', '.');
  const value = parseFloat(cleanInput);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

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
}

interface PreorderProductFormModalProps {
  mode: 'create' | 'edit';
  productId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PreorderProductFormModal({ 
  mode, 
  productId, 
  isOpen, 
  onClose, 
  onSuccess 
}: PreorderProductFormModalProps) {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Local state for EUR price input
  const [priceEUR, setPriceEUR] = useState('');

  const toastOk = (msg: string) => toast({ title: "Erfolg", description: msg });
  const toastErr = (msg: string) => toast({ title: "Fehler", description: msg, variant: "destructive" });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'per_100g',
    step_int: 100,
    price_cents: 0,
    avg_lead_time_minutes: 0,
    photo_url: '',
    is_active: true,
  });

  // Load product data for edit mode
  useEffect(() => {
    if (mode === 'edit' && productId && isOpen) {
      const loadProduct = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('preorder_products')
            .select('*')
            .eq('id', productId)
            .single();

          if (error) throw error;

          setFormData({
            name: data.name || '',
            description: data.description || '',
            unit: data.unit || 'per_100g',
            step_int: data.step_int || 100,
            price_cents: data.price_cents || 0,
            avg_lead_time_minutes: data.avg_lead_time_minutes || 0,
            photo_url: data.photo_url || '',
            is_active: data.is_active ?? true,
          });

          // Set price EUR display
          if (data.price_cents) {
            setPriceEUR(fmtEUR.format(data.price_cents / 100));
          }
        } catch (error) {
          console.error('Error loading product:', error);
          toastErr('Produkt konnte nicht geladen werden.');
        } finally {
          setLoading(false);
        }
      };
      
      loadProduct();
    } else if (mode === 'create' && isOpen) {
      // Reset form for create mode
      setFormData({
        name: '',
        description: '',
        unit: 'per_100g',
        step_int: 100,
        price_cents: 0,
        avg_lead_time_minutes: 0,
        photo_url: '',
        is_active: true,
      });
      setPriceEUR('');
    }
  }, [mode, productId, isOpen]);

  // Update step_int based on unit
  useEffect(() => {
    if (formData.unit === 'per_100g' && formData.step_int === 1) {
      setFormData(prev => ({ ...prev, step_int: 100 }));
    } else if (formData.unit === 'per_portion' && formData.step_int === 100) {
      setFormData(prev => ({ ...prev, step_int: 1 }));
    }
  }, [formData.unit]);

  const handleImageUpload = async (file: File) => {
    if (!file || !isAdmin) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `preorders/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('preorders')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('preorders')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, photo_url: data.publicUrl }));
      toastOk('Bild erfolgreich hochgeladen.');
    } catch (error) {
      console.error('Error uploading image:', error);
      toastErr('Bild konnte nicht hochgeladen werden.');
    } finally {
      setUploading(false);
    }
  };

  const handlePriceChange = (value: string) => {
    setPriceEUR(value);
    const cents = parseEURToCents(value);
    if (cents !== null) {
      setFormData(prev => ({ ...prev, price_cents: cents }));
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toastErr('Name ist erforderlich.');
      return false;
    }
    if (formData.name.length > 120) {
      toastErr('Name darf maximal 120 Zeichen lang sein.');
      return false;
    }
    if (formData.step_int < 1) {
      toastErr('Schrittweite muss mindestens 1 sein.');
      return false;
    }
    if (formData.price_cents < 0) {
      toastErr('Preis kann nicht negativ sein.');
      return false;
    }
    if (formData.avg_lead_time_minutes < 0) {
      toastErr('Vorlaufzeit kann nicht negativ sein.');
      return false;
    }
    
    // Warn if per_100g unit has unusual step
    if (formData.unit === 'per_100g' && formData.step_int !== 100) {
      toast({
        title: "Hinweis",
        description: `Bei der Einheit "pro 100 g" ist eine Schrittweite von ${formData.step_int} ungewöhnlich. Normalerweise verwendet man 100.`,
      });
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const { error } = await supabase
          .from('preorder_products')
          .insert([formData]);

        if (error) throw error;
        toastOk('Produkt wurde erfolgreich erstellt.');
      } else {
        const { error } = await supabase
          .from('preorder_products')
          .update(formData)
          .eq('id', productId);

        if (error) throw error;
        toastOk('Produkt wurde erfolgreich aktualisiert.');
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving product:', error);
      toastErr('Produkt konnte nicht gespeichert werden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (adminLoading) return null;

  if (!isAdmin) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kein Zugriff</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Sie haben keine Berechtigung für diese Aktion.</p>
          <Button onClick={onClose}>Schließen</Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl w-full">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full p-6 rounded-2xl shadow">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Neues Produkt erstellen' : 'Produkt bearbeiten'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Produktname"
                required
                maxLength={120}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Produktbeschreibung"
                rows={3}
              />
            </div>

            {/* Unit */}
            <div>
              <Label htmlFor="unit">Einheit</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_100g">pro 100 g</SelectItem>
                  <SelectItem value="per_portion">pro Portion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Step */}
            <div>
              <Label htmlFor="step_int">Schrittweite</Label>
              <Input
                id="step_int"
                type="number"
                value={formData.step_int}
                onChange={(e) => setFormData(prev => ({ ...prev, step_int: Math.max(1, parseInt(e.target.value) || 1) }))}
                min={1}
              />
            </div>

            {/* Price */}
            <div>
              <Label htmlFor="price">Preis (EUR)</Label>
              <Input
                id="price"
                value={priceEUR}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="z.B. 4,99 oder 12.50"
              />
            </div>

            {/* Lead time */}
            <div>
              <Label htmlFor="lead_time">Ø Vorlaufzeit (Minuten)</Label>
              <Input
                id="lead_time"
                type="number"
                value={formData.avg_lead_time_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, avg_lead_time_minutes: Math.max(0, parseInt(e.target.value) || 0) }))}
                min={0}
                placeholder="z.B. 120"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Wird Kunden im Vorbestellen-Tab angezeigt
              </p>
            </div>

            {/* Photo Upload */}
            <div className="md:col-span-2">
              <Label>Foto</Label>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Lädt hoch...' : 'Bild hochladen'}
                  </Button>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    className="hidden"
                  />
                </div>
                
                {formData.photo_url && (
                  <div className="relative">
                    <img
                      src={formData.photo_url}
                      alt="Produkt Vorschau"
                      className="aspect-video rounded-lg object-cover max-w-sm"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Active */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="active">Aktiv</Label>
              </div>
            </div>

            {/* ID (readonly for edit) */}
            {mode === 'edit' && productId && (
              <div className="md:col-span-2">
                <Label>ID (readonly)</Label>
                <Input value={productId} readOnly disabled />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Speichere...' : (mode === 'create' ? 'Erstellen' : 'Speichern')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}