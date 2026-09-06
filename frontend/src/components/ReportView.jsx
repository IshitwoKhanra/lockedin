import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AmbientBackground } from "@/components/AmbientBackground"

const API_URL = "http://localhost:8000"

export function ReportView() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const [reportStatus, setReportStatus] = useState("loading") // loading | ready | error
  const [report, setReport] = useState(null)

  // Fetch the report once, when this screen mounts -- this is what
  // replaces the old prop-based hand-off from the interview screen.
  // ReportView now owns its own fetch lifecycle entirely, using only
  // the sessionId from the URL.
  useEffect(() => {
    let cancelled = false

    async function fetchReport() {
      console.log("[report] fetching for session", sessionId)
      try {
        const { data: { session } } = await supabase.auth.getSession()

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 60000)

        const response = await fetch(
          `${API_URL}/generate-report?session_id=${sessionId}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
            signal: controller.signal,
          }
        )
        clearTimeout(timeoutId)
        console.log("[report] response status:", response.status)

        if (!response.ok) throw new Error(`Server returned ${response.status}`)

        const data = await response.json()
        console.log("[report] data:", data)

        if (cancelled) return // component unmounted before this resolved

        setReport(data)
        setReportStatus(data.error ? "error" : "ready")
      } catch (err) {
        console.error("[report] fetch failed:", err)
        if (cancelled) return
        const message =
          err.name === "AbortError"
            ? "Report generation took too long. Try again."
            : "Couldn't generate the report. Try again."
        setReport({ error: message })
        setReportStatus("error")
      }
    }

    fetchReport()

    // Cleanup: if the component unmounts before the fetch resolves
    // (e.g. the user navigates away early), don't try to update state
    // on a component that's no longer there.
    return () => {
      cancelled = true
    }
  }, [sessionId])

  function handleRestart() {
    navigate("/")
  }

  if (reportStatus === "loading") {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6 relative">
        <AmbientBackground />
        <p className="text-neutral-400 relative">Generating your report...</p>
      </div>
    )
  }

  if (reportStatus === "error") {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6 relative">
        <AmbientBackground />
        <p className="text-neutral-400 relative">
          {report?.error || "Something went wrong generating the report."}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10 relative">
      <AmbientBackground />

      <div className="max-w-3xl mx-auto relative animate-fade-in-up">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-neutral-500 mb-2">
              Session Complete
            </p>
            <h1
              className="text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Your Interview Report
            </h1>
          </div>

          {report.overall_score != null && (
            <div className="text-right">
              <p
                className="text-5xl font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {report.overall_score}
                <span className="text-lg text-neutral-500">/10</span>
              </p>
              <p className="text-xs text-neutral-500 mt-1">Overall Score</p>
            </div>
          )}
        </div>

        <Card className="bg-neutral-900 border-neutral-800 rounded-3xl mb-6">
          <CardContent className="p-6">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-neutral-500 mb-3">
              Overall Summary
            </p>
            <p className="text-neutral-200 leading-relaxed">{report.overall_summary}</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-neutral-900 border-neutral-800 rounded-3xl">
            <CardContent className="p-6">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-neutral-500 mb-3">
                Strengths
              </p>
              <ul className="flex flex-col gap-2 text-sm text-neutral-300">
                {report.strengths?.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900 border-neutral-800 rounded-3xl">
            <CardContent className="p-6">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-neutral-500 mb-3">
                Areas to Improve
              </p>
              <ul className="flex flex-col gap-2 text-sm text-neutral-300">
                {report.areas_to_improve?.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-neutral-900 border-neutral-800 rounded-3xl mb-6">
          <CardContent className="p-6">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-neutral-500 mb-4">
              Question by Question
            </p>
            <div className="flex flex-col gap-6">
              {report.per_question?.map((q, i) => (
                <div key={i} className="pb-6 border-b border-neutral-800 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <p className="text-sm font-semibold text-neutral-200">{q.question}</p>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-neutral-500">
                      {q.time_taken_seconds != null && (
                        <span>{Math.round(q.time_taken_seconds)}s to answer</span>
                      )}
                      {q.score != null && (
                        <span className="font-semibold text-neutral-300">{q.score}/10</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-neutral-500 mb-2 italic">{q.answer_summary}</p>
                  <p className="text-sm text-neutral-300 mb-3">{q.feedback}</p>
                  {q.ideal_approach && (
                    <div className="bg-neutral-800/50 rounded-xl p-3">
                      <p className="text-xs font-medium text-neutral-500 mb-1">
                        What a strong answer would include
                      </p>
                      <p className="text-sm text-neutral-400 leading-relaxed">
                        {q.ideal_approach}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleRestart}
          className="rounded-full h-12 px-6 bg-neutral-100 hover:bg-white text-neutral-950"
        >
          Start a New Interview
        </Button>
      </div>
    </div>
  )
}