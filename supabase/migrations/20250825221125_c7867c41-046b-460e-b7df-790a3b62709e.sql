-- Add total_points column to customers table for tracking all points ever earned
ALTER TABLE public.customers 
ADD COLUMN total_points integer DEFAULT 0 NOT NULL;

-- Update existing customers to have their current points as both active and total points
UPDATE public.customers 
SET total_points = COALESCE(points, 0);

-- Add comment to clarify the columns
COMMENT ON COLUMN public.customers.points IS 'Active points that can be redeemed for rewards';
COMMENT ON COLUMN public.customers.total_points IS 'Total points earned throughout customer lifetime (never decreases)';