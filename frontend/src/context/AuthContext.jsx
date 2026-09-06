import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"

// createContext() makes a "channel" that any component, anywhere in the
// tree, can read from -- without it being manually passed down as a prop
// through every layer in between.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true until we've checked once

  useEffect(() => {
    // On first load (e.g. a page refresh), check whether a session
    // already exists -- Supabase persists sessions in local storage, so
    // a refresh doesn't automatically log you out.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Subscribe to auth state changes going forward -- fires on sign in,
    // sign out, and token refresh, keeping `user` correct automatically
    // without any component needing to manually re-check.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    // Cleanup: stop listening when this provider unmounts (in practice,
    // only when the whole app unmounts, but good hygiene regardless).
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // Explicit, on-demand refresh -- doesn't wait for onAuthStateChange to
  // fire. Call this right after something that changes user_metadata
  // (like updateUser()) to guarantee every component reading `user` from
  // this context sees the change immediately, rather than depending on
  // event timing.
  async function refreshUser() {
    const { data: { user: freshUser } } = await supabase.auth.getUser()
    setUser(freshUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// A small custom hook wrapping useContext -- so components write
// `const { user } = useAuth()` instead of needing to import AuthContext
// and call useContext(AuthContext) directly everywhere.
export function useAuth() {
  return useContext(AuthContext)
}