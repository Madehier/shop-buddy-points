-- Create storage bucket for content images (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('content-images', 'content-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Content images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload content images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update content images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete content images" ON storage.objects;

-- Create policies for content image uploads
CREATE POLICY "Content images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'content-images');

CREATE POLICY "Anyone can upload content images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'content-images');

CREATE POLICY "Anyone can update content images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'content-images');

CREATE POLICY "Anyone can delete content images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'content-images');