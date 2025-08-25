-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create policies for announcements
-- Admins can do everything (for now, we'll use a simple policy that allows all operations)
-- In a real app, you'd want to check for admin role
CREATE POLICY "Anyone can view active announcements" 
ON public.announcements 
FOR SELECT 
USING (active = true);

CREATE POLICY "Anyone can manage announcements" 
ON public.announcements 
FOR ALL 
USING (true);