import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, CameraOff } from 'lucide-react'

interface QRScannerProps {
  onScan: (result: string) => void
  onError?: (error: string) => void
}

export const QRScanner = ({ onScan, onError }: QRScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scanner, setScanner] = useState<QrScanner | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)

  useEffect(() => {
    // Check if camera is available
    QrScanner.hasCamera().then(setHasCamera)

    return () => {
      if (scanner) {
        scanner.destroy()
      }
    }
  }, [scanner])

  const startScanning = async () => {
    if (!videoRef.current) return

    try {
      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => {
          onScan(result.data)
          stopScanning()
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      )

      await qrScanner.start()
      setScanner(qrScanner)
      setIsScanning(true)
    } catch (error) {
      console.error('Error starting scanner:', error)
      onError?.('Fehler beim Starten der Kamera')
    }
  }

  const stopScanning = () => {
    if (scanner) {
      scanner.stop()
      scanner.destroy()
      setScanner(null)
    }
    setIsScanning(false)
  }

  if (!hasCamera) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CameraOff className="h-5 w-5" />
            Keine Kamera verfügbar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Für das Scannen von QR-Codes wird eine Kamera benötigt.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          QR-Code Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full rounded-lg bg-black"
            style={{ aspectRatio: '1/1', maxHeight: '300px' }}
          />
          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <Button onClick={startScanning} size="lg">
                Scanner starten
              </Button>
            </div>
          )}
        </div>
        {isScanning && (
          <Button onClick={stopScanning} variant="outline" className="w-full">
            Scanner stoppen
          </Button>
        )}
      </CardContent>
    </Card>
  )
}