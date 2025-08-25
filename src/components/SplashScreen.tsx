import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import logo from '@/assets/logo-dorfladen-eggenthal.png'

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [showSkip, setShowSkip] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<'falling' | 'bouncing' | 'pause' | 'fadeOut'>('falling')

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (prefersReducedMotion) {
      // Simplified animation for reduced motion
      const timer = setTimeout(() => {
        setAnimationPhase('fadeOut')
        setTimeout(onComplete, 400)
      }, 1000)
      return () => clearTimeout(timer)
    }

    // Show skip button after 0.5s
    const skipTimer = setTimeout(() => setShowSkip(true), 500)

    // Animation sequence
    const fallingTimer = setTimeout(() => setAnimationPhase('bouncing'), 800)
    const bounceTimer = setTimeout(() => setAnimationPhase('pause'), 1500)
    const pauseTimer = setTimeout(() => setAnimationPhase('fadeOut'), 1800)
    const completeTimer = setTimeout(() => {
      setIsVisible(false)
      onComplete()
    }, 2200)

    return () => {
      clearTimeout(skipTimer)
      clearTimeout(fallingTimer)
      clearTimeout(bounceTimer)
      clearTimeout(pauseTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete, prefersReducedMotion])

  const handleSkip = () => {
    setAnimationPhase('fadeOut')
    setTimeout(() => {
      setIsVisible(false)
      onComplete()
    }, 300)
  }

  if (!isVisible) return null

  return (
    <div className={`
      fixed inset-0 z-50 flex items-center justify-center
      bg-gradient-to-br from-dorfladen-green to-dorfladen-light-green
      transition-opacity duration-300
      ${animationPhase === 'fadeOut' ? 'opacity-0' : 'opacity-100'}
    `}>
      {/* Animated Logo */}
      <div className="relative flex items-center justify-center w-full h-full">
        <div
          className={`
            transform transition-all duration-1000 ease-out
            ${prefersReducedMotion 
              ? 'animate-fade-in' 
              : animationPhase === 'falling' 
                ? 'animate-logo-fall' 
                : animationPhase === 'bouncing' 
                  ? 'animate-logo-bounce'
                  : 'animate-none'
            }
          `}
          style={{
            transform: prefersReducedMotion 
              ? 'none' 
              : animationPhase === 'falling'
                ? 'translateY(-100vh) rotate(-20deg)'
                : animationPhase === 'bouncing'
                  ? 'translateY(0) rotate(0deg)'
                  : 'translateY(0) rotate(0deg) scale(1)',
          }}
        >
          <img 
            src={logo} 
            alt="Dorfladen Eggenthal" 
            className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain drop-shadow-2xl"
          />
        </div>
        
        {/* Brand Text */}
        <div className={`
          absolute bottom-1/3 text-center text-white
          transition-all duration-500 delay-1000
          ${animationPhase === 'pause' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Dorfladen Eggenthal</h1>
          <p className="text-lg opacity-90">Treueprogramm</p>
        </div>
      </div>

      {/* Skip Button */}
      {showSkip && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className={`
            absolute bottom-6 right-6 text-white hover:bg-white/20
            transition-all duration-300
            ${showSkip ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <X className="w-4 h-4 mr-2" />
          Überspringen
        </Button>
      )}
    </div>
  )
}