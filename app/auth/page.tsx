'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/hooks/use-supabase-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'

export default function AuthPage() {
  const router = useRouter()
  const { signIn, signUp, loading } = useSupabaseAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (isSignUp) {
        const { data, error } = await signUp(formData.email, formData.password, formData.name)
        
        if (error) throw error

        toast.success('Compte créé avec succès! Vérifiez votre email pour confirmer votre compte.')
        router.push('/dashboard')
      } else {
        const { data, error } = await signIn(formData.email, formData.password)
        
        if (error) throw error

        toast.success('Connexion réussie!')
        router.push('/dashboard')
      }
    } catch (error: any) {
      toast.error(error.message || 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isSignUp ? 'Créer un compte' : 'Se connecter'}
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp
              ? 'Créez votre compte Big Five'
              : 'Connectez-vous à votre compte Big Five'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required={isSignUp}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
              {isSignUp && (
                <p className="text-xs text-muted-foreground">
                  Minimum 6 caractères
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  {isSignUp ? 'Création...' : 'Connexion...'}
                </span>
              ) : (
                isSignUp ? 'Créer mon compte' : 'Se connecter'
              )}
            </Button>
            
            <div className="text-center text-sm">
              {isSignUp ? (
                <p>
                  Vous avez déjà un compte?{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="text-violet-600 hover:underline font-medium"
                  >
                    Se connecter
                  </button>
                </p>
              ) : (
                <p>
                  Vous n'avez pas de compte?{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="text-violet-600 hover:underline font-medium"
                  >
                    Créer un compte
                  </button>
                </p>
              )}
            </div>

            {!isSignUp && (
              <Link 
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-violet-600 text-center"
              >
                Mot de passe oublié?
              </Link>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
