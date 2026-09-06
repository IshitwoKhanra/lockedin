import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const STATUS_STYLES = {
  Idle: "bg-neutral-600",
  "Listening...": "bg-neutral-300",
  "Assistant speaking...": "bg-white",
}

export function CameraPanel({ status, isSessionActive, hasStarted, onStart, onPause, onStop }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraError, setCameraError] = useState(null)

  // Webcam lifecycle is entirely independent of the mic/WebSocket audio
  // pipeline -- this is purely a local self-view, nothing is sent
  // anywhere. Starts when the session becomes active, stops when it ends.
  useEffect(() => {
    if (!isSessionActive) {
      // Session ended (or hasn't started) -- make sure any previous
      // camera stream is fully stopped, so the camera light turns off.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      return
    }

    let cancelled = false

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (cancelled) {
          // Session was already stopped again before permission resolved
          // -- don't leave an orphaned stream running.
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setCameraError(null)
      } catch (err) {
        setCameraError("Camera access denied or unavailable.")
      }
    }

    startCamera()

    // Cleanup: runs when isSessionActive flips back to false, or if this
    // component unmounts entirely while the camera is running.
    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [isSessionActive])

  return (
    <Card className="bg-neutral-900 border-neutral-800 rounded-3xl">
      <CardContent className="flex flex-col items-center gap-5 p-6">
        <div className="w-full aspect-video bg-neutral-950 rounded-2xl overflow-hidden flex items-center justify-center text-neutral-600 text-sm text-center px-4">
          {isSessionActive && !cameraError ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }} // mirror -- feels natural for a self-view
            />
          ) : (
            <span>{cameraError || "Camera preview appears once the interview starts"}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${STATUS_STYLES[status]} ${
              status !== "Idle" ? "animate-pulse" : ""
            }`}
          />
          <Badge variant="secondary" className="bg-transparent text-neutral-300 border-none px-0">
            {status}
          </Badge>
        </div>

        {isSessionActive ? (
          <div className="flex w-full gap-3">
            <Button
              onClick={onPause}
              variant="secondary"
              className="flex-1 rounded-full h-12 text-base font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-100"
            >
              Pause
            </Button>
            <Button
              onClick={onStop}
              className="flex-1 rounded-full h-12 text-base font-medium bg-neutral-100 hover:bg-white text-neutral-950"
            >
              Stop
            </Button>
          </div>
        ) : (
          <Button
            onClick={onStart}
            className="w-full rounded-full h-12 text-base font-medium bg-neutral-100 hover:bg-white text-neutral-950"
          >
            {hasStarted ? "Resume Interview" : "Start Interview"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}