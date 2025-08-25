import { useAuth } from '@/hooks/useAuth'
import { AuthForm } from '@/components/AuthForm'
import { CustomerDashboard } from '@/components/CustomerDashboard'
import { AdminDashboard } from '@/components/AdminDashboard'

const Index = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Lädt...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  // Check if user is admin (you can modify this logic based on your needs)
  // For now, we'll use a simple email check - replace with your admin email
  const isAdmin = user.email === 'admin@shop.com'

  return isAdmin ? <AdminDashboard /> : <CustomerDashboard />
};

export default Index;
