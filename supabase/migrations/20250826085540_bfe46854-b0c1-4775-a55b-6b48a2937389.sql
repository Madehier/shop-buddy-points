-- Create admin profile for admin@shop.com
INSERT INTO public.profiles (id, is_admin)
VALUES ('7b386a98-f02f-49c9-af6f-df08cab6b309', true)
ON CONFLICT (id) DO UPDATE SET is_admin = true;