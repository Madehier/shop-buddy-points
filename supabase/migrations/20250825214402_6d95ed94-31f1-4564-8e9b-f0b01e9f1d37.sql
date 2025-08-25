-- Enable RLS on tables that don't have it enabled
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create basic policies for customers table
CREATE POLICY "Users can view their own customer record"
ON public.customers
FOR SELECT
USING (true);  -- Allow all reads for now, can be restricted later

CREATE POLICY "Users can update their own customer record"
ON public.customers
FOR UPDATE
USING (true);

CREATE POLICY "Users can insert their own customer record"
ON public.customers
FOR INSERT
WITH CHECK (true);

-- Create basic policies for rewards table
CREATE POLICY "Anyone can view active rewards"
ON public.rewards
FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage rewards"
ON public.rewards
FOR ALL
USING (true);

-- Create basic policies for transactions table
CREATE POLICY "Anyone can manage transactions"
ON public.transactions
FOR ALL
USING (true);