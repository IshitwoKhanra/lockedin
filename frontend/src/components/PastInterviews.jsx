import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent } from "@/components/ui/card"

const API_URL = "http://localhost:8000"

async function authedFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session.access_token}` },
  })
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function PastInterviews() {
  const [sessions, setSessions] = useState(null) // null = loading

  useEffect(() => {
    async function loadSessions() {
      try {
        const response = await authedFetch("/sessions")
        const data = await response.json()
        setSessions(Array.isArray(data) ? data : [])
      } catch {
        setSessions([])
      }
    }
    loadSessions()
  }, [])

  return (
    <div className="p-6 md:p-10">
      <p className="text-xs font-medium tracking-[0.2em] uppercase text-neutral-500 mb-2">
        History
      </p>
      <h1
        className="text-3xl font-bold tracking-tight mb-8"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Past Interviews
      </h1>

      {sessions === null && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-neutral-900/40 animate-pulse" />
          ))}
        </div>
      )}

      {sessions?.length === 0 && (
        <p className="text-neutral-500">
          No past interviews yet -- start one to see it show up here.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {sessions?.map((session) => (
          <Link key={session.id} to={`/report/${session.id}`}>
            <Card className="bg-neutral-900 border-neutral-800 rounded-2xl hover:border-neutral-700 transition-colors">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-neutral-200 font-medium">
                    {formatDate(session.created_at)}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {session.report ? "Report available" : "No report generated"}
                  </p>
                </div>

                {session.report?.overall_score != null && (
                  <div className="text-right">
                    <p
                      className="text-2xl font-bold"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {session.report.overall_score}
                      <span className="text-sm text-neutral-500">/10</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}