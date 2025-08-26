import { useState, useEffect } from 'react'
import logo from '@/assets/logo-dorfladen-eggenthal.png'

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Show for 1.5 seconds then fade out
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onComplete, 300) // 300ms for crossfade
    }, 1500)

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className={`
      fixed inset-0 z-50 flex flex-col items-center justify-center
      bg-primary
      transition-opacity duration-300
      ${isVisible ? 'opacity-100' : 'opacity-0'}
    `}>
      {/* Logo */}
      <div className="flex flex-col items-center justify-center">
        <img 
          src={logo} 
          alt="Dorfladen Eggenthal" 
          className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain"
        />
        
        {/* Subtitle */}
        <p className="mt-6 text-white text-lg md:text-xl font-medium">
          Schön dass du wieder da bist
        </p>
      </div>
    </div>
  )
}