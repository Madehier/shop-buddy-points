-- Create storage bucket for content images (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('content-images', 'content-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for content image uploads
CREATE POLICY IF NOT EXISTS "Content images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'content-images');

CREATE POLICY IF NOT EXISTS "Anyone can upload content images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'content-images');

CREATE POLICY IF NOT EXISTS "Anyone can update content images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'content-images');

CREATE POLICY IF NOT EXISTS "Anyone can delete content images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'content-images');