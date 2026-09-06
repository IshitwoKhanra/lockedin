import { useState, useRef, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useInterviewSession } from "@/hooks/useInterviewSession"
import { useAuth } from "@/context/AuthContext"
import { getRandomMotivationalMessage, getDisplayName } from "@/lib/motivation"
import { CameraPanel } from "@/components/CameraPanel"
import { TranscriptPanel } from "@/components/TranscriptPanel"
import { MetricsPanel } from "@/components/MetricsPanel"

export function InterviewScreen() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Picked once on mount (lazy useState initializer), not re-rolled on
  // every re-render -- otherwise it would change every time any state
  // in this component updates, which happens constantly during a call.
  const [motivationalMessage] = useState(() =>
    getRandomMotivationalMessage(getDisplayName(user))
  )

  // onAutoEnd needs to call handleStop, but handleStop needs
  // stopInterview (the hook's own return value) -- this ref lets the
  // hook safely call "whatever handleStop currently is" without a
  // circular reference at definition time.
  const autoEndHandlerRef = useRef(() => {})

  const {
    status,
    isSessionActive,
    transcript,
    answerStartedAt,
    lastAnswerDurationMs,
    startInterview,
    stopInterview,
  } = useInterviewSession(sessionId, {
    onAutoEnd: () => autoEndHandlerRef.current(),
  })

  // Tracks whether the session has EVER been started, so the button can
  // say "Resume Interview" after a pause instead of "Start Interview"
  // again -- purely a label decision, doesn't affect any actual logic.
  const [hasStarted, setHasStarted] = useState(false)

  function handleStart() {
    // Must be called synchronously, as the very first thing in this
    // click handler -- browsers (Safari especially) require fullscreen
    // requests to happen immediately within a user gesture. Waiting for
    // the async mic/camera permission prompts to resolve first would
    // make the request happen "too late" and get silently rejected.
    document.documentElement.requestFullscreen?.().catch(() => {
      // Fullscreen can be denied/unsupported -- never let that block
      // the actual interview from starting.
    })

    setHasStarted(true)
    startInterview()
  }

  function exitFullscreenIfActive() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  function handlePause() {
    // Cleanup only -- stays on this screen. The backend already knows
    // how to resume this exact conversation on the next connection
    // (same logic that already handles reconnect-after-disconnect).
    stopInterview()
    exitFullscreenIfActive()
  }

  function handleStop() {
    stopInterview()
    exitFullscreenIfActive()
    navigate(`/report/${sessionId}`)
  }

  useEffect(() => {
    autoEndHandlerRef.current = handleStop
  })

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10">
      <header className="mb-10">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-neutral-500 mb-2">
          Practice Interview
        </p>
        <h1
          className="text-4xl md:text-5xl font-bold tracking-tight leading-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {motivationalMessage}
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_280px] gap-6">
        <CameraPanel
          status={status}
          isSessionActive={isSessionActive}
          hasStarted={hasStarted}
          onStart={handleStart}
          onPause={handlePause}
          onStop={handleStop}
        />
        <TranscriptPanel transcript={transcript} />
        <MetricsPanel
          transcript={transcript}
          answerStartedAt={answerStartedAt}
          lastAnswerDurationMs={lastAnswerDurationMs}
        />
      </div>
    </div>
  )
}