export const dynamic = 'force-dynamic';

import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis")
        }

        // Authentifier via Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })

        if (error || !data.user) {
          throw new Error("Identifiants invalides")
        }

        // Récupérer le profil utilisateur
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        return {
          id: data.user.id,
          email: data.user.email!,
          name: profile?.name || data.user.email!,
          role: profile?.role || 'user',
          plan: profile?.plan || 'Free',
          image: null,
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.plan = (user as any).plan
      }

      // Permettre la mise à jour de la session
      if (trigger === "update" && session) {
        token.name = session.name
        token.plan = session.plan
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.plan = token.plan as string
      }
      return session
    },
  },
  events: {
    async signIn({ user }) {
      // Log de connexion (optionnel)
      console.log(`User ${user.email} signed in`)
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
