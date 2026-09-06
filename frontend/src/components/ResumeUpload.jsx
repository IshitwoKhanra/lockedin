import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { UploadCloud, ListChecks, Mic, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AmbientBackground } from "@/components/AmbientBackground"
import { InteractiveGrid } from "@/components/InteractiveGrid"

const API_URL = "http://localhost:8000"

const STEPS = [
  {
    icon: UploadCloud,
    title: "Upload your resume",
    description:
      "We read it and tailor every question to your actual projects and experience -- not generic prompts.",
  },
  {
    icon: ListChecks,
    title: "Confirm the details",
    description:
      "The AI reads back what it found and asks which domain or role you'd like to practice for today.",
  },
  {
    icon: Mic,
    title: "Speak naturally",
    description:
      "Answer out loud, like a real interview. No typing, no scripts -- just you thinking on your feet.",
  },
  {
    icon: Sparkles,
    title: "Get a real report",
    description:
      "Specific, actionable feedback per question -- not just a score. See exactly what to work on next.",
  },
]

async function authedFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session.access_token}` },
  })
}

export function ResumeUpload() {
  const navigate = useNavigate()

  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)

  const [hasPreviousResume, setHasPreviousResume] = useState(null)
  const [isContinuing, setIsContinuing] = useState(false)

  useEffect(() => {
    async function checkPreviousSessions() {
      try {
        const response = await authedFetch("/sessions")
        const sessions = await response.json()
        setHasPreviousResume(Array.isArray(sessions) && sessions.length > 0)
      } catch {
        setHasPreviousResume(false)
      }
    }
    checkPreviousSessions()
  }, [])

  async function handleUpload() {
    if (!file) return
    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await authedFetch("/upload-resume", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Upload failed")

      const data = await response.json()
      navigate(`/interview/${data.session_id}`)
    } catch (err) {
      setError("Couldn't upload your resume. Try again.")
    } finally {
      setIsUploading(false)
    }
  }

  async function handleContinueWithPrevious() {
    setIsContinuing(true)
    setError(null)

    try {
      const response = await authedFetch("/continue-with-previous-resume", {
        method: "POST",
      })
      const data = await response.json()

      if (data.error) throw new Error(data.error)

      navigate(`/interview/${data.session_id}`)
    } catch (err) {
      setError("Couldn't start with your previous resume. Try uploading a new one.")
    } finally {
      setIsContinuing(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative p-6 md:p-10">
      <AmbientBackground />
      <InteractiveGrid />

      <div className="relative grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-12 items-center min-h-[calc(100vh-8rem)]">
        <Card className="bg-neutral-900 border-neutral-800 rounded-3xl w-full animate-fade-in-up">
          <CardContent className="flex flex-col gap-5 p-8">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-neutral-500 mb-2">
                Get Started
              </p>
              <h2
                className="text-2xl font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Upload your resume
              </h2>
              <p className="text-sm text-neutral-500 mt-2">
                Questions will be grounded in your actual background.
              </p>
            </div>

            {hasPreviousResume === null && (
              <div className="w-full h-12 rounded-full bg-neutral-800/40 animate-pulse" />
            )}

            {hasPreviousResume === true && (
              <>
                <Button
                  onClick={handleContinueWithPrevious}
                  disabled={isContinuing}
                  variant="secondary"
                  className="w-full rounded-full h-12 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 disabled:opacity-40"
                >
                  {isContinuing ? "Starting..." : "Continue with previous resume"}
                </Button>

                <div className="flex items-center gap-3 text-xs text-neutral-600">
                  <div className="h-px flex-1 bg-neutral-800" />
                  or upload a new one
                  <div className="h-px flex-1 bg-neutral-800" />
                </div>
              </>
            )}

            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files[0])}
              className="text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-neutral-800 file:text-neutral-200 file:text-sm"
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full rounded-full h-12 bg-neutral-100 hover:bg-white text-neutral-950 disabled:opacity-40"
            >
              {isUploading ? "Uploading..." : "Continue"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-neutral-500 mb-2">
            How it works
          </p>

          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div
                key={i}
                className="group flex items-start gap-4 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 hover:border-neutral-700 hover:scale-[1.02] transition-all duration-300 cursor-default animate-fade-in-up"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-800 text-neutral-400 group-hover:bg-neutral-100 group-hover:text-neutral-950 transition-colors duration-300 shrink-0">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-100 mb-1">
                    <span className="text-neutral-600 mr-2">{i + 1}</span>
                    {step.title}
                  </p>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}