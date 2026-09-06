import { useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"

const WS_URL = "ws://localhost:8000/ws/audio"

function floatTo16BitPCM(float32Array) {
  const int16Array = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16Array
}

/**
 * All the WebSocket + mic-capture + playback logic lives here, isolated
 * from any component. A component just calls useInterviewSession() and
 * gets back plain data (status, transcript, isSessionActive) plus two
 * functions (startInterview, stopInterview) -- it never needs to know
 * HOW any of this works, only what it returns.
 *
 * Report generation is NOT this hook's job anymore -- now that each
 * screen is its own route, the report is fetched independently by
 * ReportView itself once the user navigates to /report/:sessionId.
 * stopInterview()'s only job here is to tear the session down cleanly.
 */
export function useInterviewSession(sessionId, { onAutoEnd } = {}) {
  const [status, setStatus] = useState("Idle")
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [answerStartedAt, setAnswerStartedAt] = useState(null)      // timestamp, or null when not timing
  const [lastAnswerDurationMs, setLastAnswerDurationMs] = useState(null)

  const socketRef = useRef(null)
  const audioContextRef = useRef(null)
  const micStreamRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const processorNodeRef = useRef(null)
  const playbackAudioContextRef = useRef(null)
  const playbackQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const sendingMicAudioRef = useRef(true)
  const turnActiveRef = useRef(false)
  const assistantDoneRef = useRef(false)
  const autoEndPendingRef = useRef(false)

  function tryResumeMic() {
    if (assistantDoneRef.current && !isPlayingRef.current && playbackQueueRef.current.length === 0) {
      if (autoEndPendingRef.current) {
        autoEndPendingRef.current = false
        onAutoEnd?.()
        return
      }
      sendingMicAudioRef.current = true
      setStatus("Listening...")
      setAnswerStartedAt(Date.now())
    }
  }

  function playNextInQueue() {
    if (isPlayingRef.current || playbackQueueRef.current.length === 0) {
      tryResumeMic()
      return
    }
    isPlayingRef.current = true

    const audioBuffer = playbackQueueRef.current.shift()
    const source = playbackAudioContextRef.current.createBufferSource()
    source.buffer = audioBuffer
    source.connect(playbackAudioContextRef.current.destination)
    source.onended = () => {
      isPlayingRef.current = false
      playNextInQueue()
    }
    source.start()
  }

  async function handleIncomingAudio(blob) {
    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await playbackAudioContextRef.current.decodeAudioData(arrayBuffer)
    playbackQueueRef.current.push(audioBuffer)
    playNextInQueue()
  }

  function startNewTurn() {
    turnActiveRef.current = true
    assistantDoneRef.current = false
    setStatus("Assistant speaking...")
    setTranscript((prev) => [...prev, { speaker: "assistant", text: "" }])
  }

  function appendToCurrentAssistantLine(sentence) {
    setTranscript((prev) => {
      const updated = [...prev]
      const last = updated[updated.length - 1]
      updated[updated.length - 1] = { ...last, text: last.text + sentence + " " }
      return updated
    })
  }

  async function startInterview() {
    micStreamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
    })

    audioContextRef.current = new AudioContext({ sampleRate: 16000 })
    playbackAudioContextRef.current = new AudioContext()

    sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(micStreamRef.current)
    processorNodeRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1)

    processorNodeRef.current.onaudioprocess = (event) => {
      if (!sendingMicAudioRef.current) return
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return
      const floatSamples = event.inputBuffer.getChannelData(0)
      const int16Samples = floatTo16BitPCM(floatSamples)
      socketRef.current.send(int16Samples.buffer)
    }

    const silentGain = audioContextRef.current.createGain()
    silentGain.gain.value = 0
    sourceNodeRef.current.connect(processorNodeRef.current)
    processorNodeRef.current.connect(silentGain)
    silentGain.connect(audioContextRef.current.destination)

    const { data: { session } } = await supabase.auth.getSession()
    const url = sessionId
      ? `${WS_URL}?session_id=${sessionId}&access_token=${session.access_token}`
      : WS_URL
    socketRef.current = new WebSocket(url)

    socketRef.current.onopen = () => setStatus("Listening...")

    socketRef.current.onmessage = (event) => {
      if (typeof event.data === "string") {
        if (event.data === "__END_TURN__") {
          assistantDoneRef.current = true
          turnActiveRef.current = false
          tryResumeMic()
          return
        }

        if (event.data === "__AUTO_END__") {
          assistantDoneRef.current = true
          turnActiveRef.current = false
          autoEndPendingRef.current = true
          tryResumeMic() // will fire onAutoEnd once the closing audio finishes
          return
        }

        if (event.data.startsWith("__USER__")) {
          const userText = event.data.slice("__USER__".length)
          setTranscript((prev) => [...prev, { speaker: "user", text: userText }])
          sendingMicAudioRef.current = false
          setStatus("Thinking...")

          // Freeze the timer -- record how long that answer took, then
          // stop live-ticking until the next question resumes it.
          setAnswerStartedAt((startedAt) => {
            if (startedAt) setLastAnswerDurationMs(Date.now() - startedAt)
            return null
          })
          return
        }

        if (!turnActiveRef.current) startNewTurn()
        appendToCurrentAssistantLine(event.data)
      } else {
        handleIncomingAudio(event.data)
      }
    }

    socketRef.current.onclose = () => setStatus("Idle")

    setIsSessionActive(true)
  }

  function stopInterview() {
    if (processorNodeRef.current) processorNodeRef.current.disconnect()
    if (sourceNodeRef.current) sourceNodeRef.current.disconnect()
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop())
    if (socketRef.current) socketRef.current.close()
    setIsSessionActive(false)
    setStatus("Idle")
    // If an answer was mid-timing when paused/stopped, that measurement
    // is no longer meaningful -- clear it rather than let it resume
    // ticking from a stale timestamp later.
    setAnswerStartedAt(null)
  }

  return {
    status,
    isSessionActive,
    transcript,
    answerStartedAt,
    lastAnswerDurationMs,
    startInterview,
    stopInterview,
  }
}