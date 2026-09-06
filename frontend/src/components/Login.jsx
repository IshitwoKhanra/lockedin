import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AmbientBackground } from "@/components/AmbientBackground"

const WORDMARK = "lockedin"

export function Login() {
  const navigate = useNavigate()

  // Typewriter effect: reveal WORDMARK one character at a time on mount.
  const [typedText, setTypedText] = useState("")
  const isTypingDone = typedText.length === WORDMARK.length

  useEffect(() => {
    let charIndex = 0
    const intervalId = setInterval(() => {
      charIndex++
      setTypedText(WORDMARK.slice(0, charIndex))
      if (charIndex >= WORDMARK.length) clearInterval(intervalId)
    }, 150) // ms per character

    return () => clearInterval(intervalId)
  }, [])

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    setError(null)
    setIsSubmitting(true)

    try {
      const { error: authError } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError(authError.message)
        return
      }

      if (isSignUp) {
        setError("Check your email to confirm your account, then sign in.")
        setIsSignUp(false)
      } else {
        navigate("/")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6 relative gap-10">
      <AmbientBackground />

      {/* Wordmark -- the landing-page moment for this screen */}
      <div className="flex flex-col items-center gap-3 min-h-[6rem] justify-center">
        <h1
          className="relative text-6xl md:text-7xl font-light tracking-tight text-white text-glow-white"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {typedText}
          <span className="animate-blink">|</span>
        </h1>
        {isTypingDone && (
          <p className="text-sm text-neutral-400 tracking-wide animate-fade-in-up">
            Lock In. Stand Out.
          </p>
        )}
      </div>

      <Card className="bg-neutral-900 border-neutral-800 rounded-3xl max-w-md w-full relative animate-fade-in-up">
        <CardContent className="flex flex-col gap-5 p-8">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-neutral-500 mb-2">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </p>
            <h2
              className="text-2xl font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {isSignUp ? "Sign up to get started" : "Sign in to continue"}
            </h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-400">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-neutral-800/60 border border-neutral-700 rounded-lg px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-400/20 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-400">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-neutral-800/60 border border-neutral-700 rounded-lg px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-400/20 transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={!email || !password || isSubmitting}
            className="w-full rounded-full h-12 bg-neutral-100 hover:bg-white text-neutral-950 disabled:opacity-40"
          >
            {isSubmitting ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
          </Button>

          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
            }}
            className="text-sm text-neutral-400 hover:text-neutral-200 underline"
          >
            {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}