-- Create storage bucket for offer images
INSERT INTO storage.buckets (id, name, public)
VALUES ('offers', 'offers', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for offers bucket
CREATE POLICY "Admins can upload offer images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'offers' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can update offer images"  
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'offers'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can delete offer images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'offers'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Anyone can view offer images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'offers');