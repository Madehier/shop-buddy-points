-- Create badges table
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  condition_type TEXT NOT NULL, -- 'points_total', 'purchases_week', 'redemptions_total', 'consecutive_days'
  condition_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true
);

-- Create customer_badges table
CREATE TABLE public.customer_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badges
CREATE POLICY "Anyone can view active badges"
ON public.badges
FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage badges"
ON public.badges
FOR ALL
USING (true);

-- RLS Policies for customer_badges
CREATE POLICY "Users can view their own badges"
ON public.customer_badges
FOR SELECT
USING (customer_id = ((auth.uid())::text)::uuid);

CREATE POLICY "Admins can view all customer badges"
ON public.customer_badges
FOR SELECT
USING (true);

CREATE POLICY "System can create customer badges"
ON public.customer_badges
FOR INSERT
WITH CHECK (true);

-- Insert default badges
INSERT INTO public.badges (name, description, icon, condition_type, condition_value) VALUES
('Erste Schritte', 'Herzlich willkommen! Sie haben Ihre ersten Punkte gesammelt.', 'Baby', 'points_total', 10),
('Sammler', 'Großartig! Sie haben bereits 500 Punkte gesammelt.', 'Trophy', 'points_total', 500),
('Treuer Kunde', 'Wow! 1000 Punkte zeigen Ihre Treue zum Dorfladen.', 'Medal', 'points_total', 1000),
('Punkte-Meister', 'Unglaublich! 2500 Punkte - Sie sind ein wahrer Meister!', 'Crown', 'points_total', 2500),
('Einkaufs-Enthusiast', '3 Einkäufe in einer Woche - Sie lieben den Dorfladen!', 'ShoppingCart', 'purchases_week', 3),
('Wochenend-Shopper', '5 Einkäufe in einer Woche - beeindruckend!', 'Calendar', 'purchases_week', 5),
('Belohnungs-Sammler', 'Sie haben bereits 5 Belohnungen eingelöst!', 'Gift', 'redemptions_total', 5),
('Belohnungs-Meister', '10 Belohnungen eingelöst - Sie nutzen das System perfekt!', 'Star', 'redemptions_total', 10),
('Dorfladen-Veteran', '20 Belohnungen eingelöst - Sie sind ein echter Veteran!', 'Award', 'redemptions_total', 20);

-- Create function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(customer_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  badge_record RECORD;
  customer_record RECORD;
  new_badges_count INTEGER := 0;
  purchase_count INTEGER;
  redemption_count INTEGER;
BEGIN
  -- Get customer data
  SELECT * INTO customer_record FROM public.customers WHERE id = customer_uuid;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Check each badge condition
  FOR badge_record IN SELECT * FROM public.badges WHERE active = true LOOP
    -- Skip if customer already has this badge
    IF EXISTS (SELECT 1 FROM public.customer_badges WHERE customer_id = customer_uuid AND badge_id = badge_record.id) THEN
      CONTINUE;
    END IF;

    -- Check conditions based on type
    CASE badge_record.condition_type
      WHEN 'points_total' THEN
        IF customer_record.total_points >= badge_record.condition_value THEN
          INSERT INTO public.customer_badges (customer_id, badge_id) VALUES (customer_uuid, badge_record.id);
          new_badges_count := new_badges_count + 1;
        END IF;
        
      WHEN 'purchases_week' THEN
        -- Count purchases in the last 7 days
        SELECT COUNT(DISTINCT DATE(created_at)) INTO purchase_count
        FROM public.transactions 
        WHERE customer_id = customer_uuid 
          AND type = 'purchase' 
          AND created_at >= NOW() - INTERVAL '7 days';
          
        IF purchase_count >= badge_record.condition_value THEN
          INSERT INTO public.customer_badges (customer_id, badge_id) VALUES (customer_uuid, badge_record.id);
          new_badges_count := new_badges_count + 1;
        END IF;
        
      WHEN 'redemptions_total' THEN
        -- Count total redemptions
        SELECT COUNT(*) INTO redemption_count
        FROM public.transactions 
        WHERE customer_id = customer_uuid 
          AND type = 'redemption';
          
        IF redemption_count >= badge_record.condition_value THEN
          INSERT INTO public.customer_badges (customer_id, badge_id) VALUES (customer_uuid, badge_record.id);
          new_badges_count := new_badges_count + 1;
        END IF;
    END CASE;
  END LOOP;

  RETURN new_badges_count;
END;
$$;

-- Create trigger function to automatically check badges on transaction changes
CREATE OR REPLACE FUNCTION public.trigger_check_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check badges for the customer
  PERFORM public.check_and_award_badges(NEW.customer_id);
  RETURN NEW;
END;
$$;

-- Create trigger on transactions table
CREATE TRIGGER trigger_transaction_badge_check
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_badges();

-- Create trigger function for customer updates
CREATE OR REPLACE FUNCTION public.trigger_check_badges_on_customer_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check badges when total_points changes
  IF OLD.total_points != NEW.total_points THEN
    PERFORM public.check_and_award_badges(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on customers table
CREATE TRIGGER trigger_customer_badge_check
  AFTER UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_badges_on_customer_update();