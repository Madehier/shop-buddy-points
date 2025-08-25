-- Create content_blocks table
CREATE TABLE public.content_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT,
  body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;

-- Create policies for content_blocks
CREATE POLICY "Anyone can view active content blocks" 
ON public.content_blocks 
FOR SELECT 
USING (active = true);

CREATE POLICY "Anyone can manage content blocks" 
ON public.content_blocks 
FOR ALL 
USING (true);

-- Create storage bucket for content images
INSERT INTO storage.buckets (id, name, public) VALUES ('content-images', 'content-images', true);

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

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_content_blocks_updated_at
BEFORE UPDATE ON public.content_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to ensure only one active content block
CREATE OR REPLACE FUNCTION public.ensure_single_active_content_block()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a content block to active, deactivate all others
  IF NEW.active = true THEN
    UPDATE public.content_blocks 
    SET active = false 
    WHERE id != NEW.id AND active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure only one active content block
CREATE TRIGGER ensure_single_active_content_block_trigger
BEFORE INSERT OR UPDATE ON public.content_blocks
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_active_content_block();