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
    console.log('Index effect - user:', !!user, 'loading:', loading, 'splashShown:', !!sessionStorage.getItem('splashShown'))
    
    // Only proceed if not loading and user exists
    if (!loading && user) {
      const splashShown = sessionStorage.getItem('splashShown')
      console.log('User authenticated, splash shown?', !!splashShown)
      
      if (!splashShown) {
        console.log('Showing splash screen')
        setShowSplash(true)
        setDashboardReady(false)
      } else {
        console.log('Skipping splash, going to dashboard')
        setShowSplash(false)
        setDashboardReady(true)
      }
    } else if (!loading && !user) {
      // Reset states when user logs out
      setShowSplash(false)
      setDashboardReady(false)
      // Clear splash flag when user logs out so it shows again next time
      sessionStorage.removeItem('splashShown')
    }
  }, [user, loading])

  const handleSplashComplete = () => {
    console.log('Splash screen completed')
    sessionStorage.setItem('splashShown', 'true')
    setShowSplash(false)
    setDashboardReady(true)
  }

  if (loading) {
    console.log('Still loading...')
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
    console.log('No user, showing auth form')
    return <AuthForm />
  }

  if (showSplash) {
    console.log('Showing splash screen')
    return <SplashScreen onComplete={handleSplashComplete} />
  }

  if (!dashboardReady) {
    console.log('Dashboard not ready, showing nothing')
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Bereite Dashboard vor...</p>
        </div>
      </div>
    )
  }

  // Check if user is admin (you can modify this logic based on your needs)
  // For now, we'll use a simple email check - replace with your admin email
  const isAdmin = user.email === 'admin@shop.com'

  return isAdmin ? <AdminDashboard /> : <CustomerDashboard />
}

export default Index