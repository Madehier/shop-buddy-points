-- Create profiles for all existing users who don't have one
INSERT INTO public.profiles (id, is_admin, created_at)
SELECT 
  au.id,
  CASE 
    WHEN au.email = 'admin@shop.com' THEN true
    ELSE false
  END as is_admin,
  now()
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Update existing admin profile to ensure it's marked as admin
UPDATE public.profiles 
SET is_admin = true 
WHERE id IN (
  SELECT au.id 
  FROM auth.users au 
  WHERE au.email = 'admin@shop.com'
);