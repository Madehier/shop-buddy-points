import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const { toast } = useToast()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await signIn(email, password)
    
    if (error) {
      toast({
        title: "Fehler beim Anmelden",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Erfolgreich angemeldet",
        description: "Willkommen zurück!",
      })
    }
    
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await signUp(email, password, name)
    
    if (error) {
      toast({
        title: "Fehler bei der Registrierung",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Registrierung erfolgreich",
        description: "Bitte überprüfen Sie Ihre E-Mail zur Bestätigung.",
      })
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Dorfladen Branding Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-heading font-bold text-dorfladen-green">
            Dorfladen Eggenthal
          </h1>
          <p className="text-lg text-muted-foreground">
            Sammle Punkte bei jedem Einkauf
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-8">
            <Tabs defaultValue="signin" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1 h-12">
                <TabsTrigger 
                  value="signin" 
                  className="data-[state=active]:bg-dorfladen-green data-[state=active]:text-white data-[state=inactive]:text-muted-foreground data-[state=inactive]:bg-transparent border-0 font-medium h-10"
                >
                  Anmelden
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-dorfladen-green data-[state=active]:text-white data-[state=inactive]:text-muted-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:border data-[state=inactive]:border-border/50 font-medium h-10"
                >
                  Registrieren
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Passwort</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" variant="dorfladen" disabled={loading}>
                    {loading ? "Anmelden..." : "Anmelden"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Passwort</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" variant="dorfladen" disabled={loading}>
                    {loading ? "Registrieren..." : "Registrieren"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}