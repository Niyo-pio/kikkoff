import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { User } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '../lib/supabase'

WebBrowser.maybeCompleteAuthSession()

type AuthContextValue = {
  user: User | null
  loading: boolean
  configured: boolean
  redirectUri: string
  signInWithGoogle: () => Promise<boolean>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const redirectUri = Linking.createURL('auth/callback')

  useEffect(() => {
    if (!supabase) return

    let active = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) console.error('Could not restore the sign-in session:', error.message)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Add the Supabase URL and publishable key to mobile/.env.local.')

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    })
    if (error) throw error
    if (!data.url) throw new Error('Google sign-in did not return a URL.')

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri)
    if (result.type !== 'success') return false

    const query = Linking.parse(result.url).queryParams ?? {}
    if (typeof query.error_description === 'string') throw new Error(query.error_description)
    if (typeof query.code !== 'string') {
      throw new Error('Google sign-in did not return an authorization code. Please try again.')
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(query.code)
    if (exchangeError) throw exchangeError
    return true
  }, [redirectUri])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo(
    () => ({ user, loading, configured: Boolean(supabase), redirectUri, signInWithGoogle, signOut }),
    [user, loading, redirectUri, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}
