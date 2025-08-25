import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AuthForm } from '@/components/AuthForm'
import { CustomerDashboard } from '@/components/CustomerDashboard'
import { AdminDashboard } from '@/components/AdminDashboard'
import { SplashScreen } from '@/components/SplashScreen'

const Index = () => {
  const { user, loading } = useAuth()
  const [showSplash, setShowSplash] = useState(false)
  const [dashboardReady, setDashboardReady] = useState(false)

  useEffect(() => {
    // Check if splash was already shown this session
    if (user && !sessionStorage.getItem('splashShown')) {
      setShowSplash(true)
    } else if (user) {
      setDashboardReady(true)
    }
  }, [user])

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', 'true')
    setShowSplash(false)
    setDashboardReady(true)
  }

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

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />
  }

  if (!dashboardReady) {
    return null // Brief moment while transitioning
  }

  // Check if user is admin (you can modify this logic based on your needs)
  // For now, we'll use a simple email check - replace with your admin email
  const isAdmin = user.email === 'admin@shop.com'

  return isAdmin ? <AdminDashboard /> : <CustomerDashboard />
}

export default Index