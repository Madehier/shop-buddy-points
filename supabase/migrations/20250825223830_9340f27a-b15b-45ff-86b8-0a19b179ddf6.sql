-- Create claims table for reward redemption tracking
CREATE TABLE public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  reward_id UUID NOT NULL,
  qr_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('EINGELÖST', 'ABGEHOLT')) DEFAULT 'EINGELÖST',
  points_redeemed INTEGER NOT NULL,
  reward_name TEXT NOT NULL,
  reward_description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on claims table
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Create policies for claims
CREATE POLICY "Users can view their own claims" 
ON public.claims 
FOR SELECT 
USING (customer_id = auth.uid()::text::uuid);

CREATE POLICY "Users can create their own claims" 
ON public.claims 
FOR INSERT 
WITH CHECK (customer_id = auth.uid()::text::uuid);

CREATE POLICY "Admins can view all claims" 
ON public.claims 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can update all claims" 
ON public.claims 
FOR UPDATE 
USING (true);

-- Add reward_id and claim_id to transactions table for better tracking
ALTER TABLE public.transactions 
ADD COLUMN reward_id UUID,
ADD COLUMN claim_id UUID;

-- Create trigger for automatic timestamp updates on claims
CREATE TRIGGER update_claims_updated_at
BEFORE UPDATE ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_claims_customer_id ON public.claims(customer_id);
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_claims_qr_code ON public.claims(qr_code);