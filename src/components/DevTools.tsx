import { Button } from '@/components/ui/button'

export function DevTools() {
  const clearSplashStorage = () => {
    sessionStorage.removeItem('splashShown')
    console.log('Cleared splash storage - splash will show on next login')
    alert('Splash storage cleared! Log out and log back in to see the splash screen.')
  }

  return (
    <div className="fixed bottom-4 left-4 p-2 bg-red-100 border border-red-300 rounded-lg z-50">
      <p className="text-xs text-red-700 mb-2">Dev Tools</p>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={clearSplashStorage}
        className="text-xs"
      >
        Clear Splash Storage
      </Button>
    </div>
  )
}