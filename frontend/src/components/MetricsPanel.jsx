import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { computeAnswerMetrics, formatDuration } from "@/lib/metrics"

export function MetricsPanel({ transcript, answerStartedAt, lastAnswerDurationMs }) {
  const lastUserEntry = [...transcript].reverse().find((entry) => entry.speaker === "user")
  const metrics = computeAnswerMetrics(lastUserEntry?.text)
  const hasAnswer = lastUserEntry && metrics.wordCount > 0

  // Live-ticking elapsed time while answerStartedAt is set. This is a
  // separate piece of local state specifically because it needs to
  // re-render once per second on its own -- it can't be derived purely
  // from props the way wordCount/fillerCount can.
  const [liveElapsedMs, setLiveElapsedMs] = useState(0)

  useEffect(() => {
    if (!answerStartedAt) return

    const intervalId = setInterval(() => {
      setLiveElapsedMs(Date.now() - answerStartedAt)
    }, 1000)

    return () => clearInterval(intervalId)
  }, [answerStartedAt])

  // Whichever duration is relevant right now: still-running (live) takes
  // priority over the last completed answer's frozen duration.
  const displayedDurationMs = answerStartedAt ? liveElapsedMs : lastAnswerDurationMs
  const isTimerRunning = Boolean(answerStartedAt)

  return (
    <Card className="bg-neutral-900 border-neutral-800 rounded-3xl">
      <CardContent className="p-6">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-neutral-500 mb-4">
          This Answer
        </p>

        <div className="flex flex-col gap-5">
          <div>
            <p
              className={`text-3xl font-semibold ${isTimerRunning ? "animate-pulse" : ""}`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {formatDuration(displayedDurationMs)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {isTimerRunning ? "Answering now..." : "Time taken"}
            </p>
          </div>

          {hasAnswer && (
            <>
              <div>
                <p
                  className="text-3xl font-semibold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {metrics.wordCount}
                </p>
                <p className="text-xs text-neutral-500 mt-1">Words</p>
              </div>

              <div>
                <p
                  className="text-3xl font-semibold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {metrics.fillerCount}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Filler words ({metrics.fillerRate.toFixed(1)}% of answer)
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-neutral-600 mt-6 leading-relaxed">
          Full delivery + content report available after the session.
        </p>
      </CardContent>
    </Card>
  )
}