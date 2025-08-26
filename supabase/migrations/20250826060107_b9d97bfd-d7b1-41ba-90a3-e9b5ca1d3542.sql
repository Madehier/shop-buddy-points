-- Add settings table for point ratios and other configurations
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings
CREATE POLICY "Admins can manage settings" 
ON public.settings 
FOR ALL 
USING (true);

-- Insert default point ratio
INSERT INTO public.settings (key, value, description) 
VALUES ('points_per_euro', '1.0', 'Punkte pro Euro Einkaufswert') 
ON CONFLICT (key) DO NOTHING;

-- Add scan_uuid to transactions to prevent double scanning
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS scan_uuid uuid;

-- Create index for scan_uuid
CREATE INDEX IF NOT EXISTS idx_transactions_scan_uuid ON public.transactions(scan_uuid) WHERE scan_uuid IS NOT NULL;

-- Create trigger for settings updated_at
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();