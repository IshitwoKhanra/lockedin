// Common filler words/phrases first-time interviewees tend to overuse.
// Deliberately simple (word/phrase matching, not NLP) -- transparent and
// predictable, which matters more here than being exhaustive.
export function formatDuration(ms) {
  if (ms == null) return "--:--"
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

const FILLER_PATTERNS = [
  "um", "uh", "uhh", "umm", "like", "you know", "sort of", "kind of",
  "basically", "actually", "i mean", "so yeah",
]

export function computeAnswerMetrics(text) {
  if (!text || !text.trim()) {
    return { wordCount: 0, fillerCount: 0, fillerRate: 0 }
  }

  const words = text.trim().split(/\s+/)
  const wordCount = words.length

  const lowerText = text.toLowerCase()
  let fillerCount = 0
  for (const pattern of FILLER_PATTERNS) {
    // \b = word boundary -- matches "um" as its own word, not inside
    // "umbrella". 'g' flag counts every occurrence, not just the first.
    const regex = new RegExp(`\\b${pattern}\\b`, "g")
    const matches = lowerText.match(regex)
    if (matches) fillerCount += matches.length
  }

  const fillerRate = wordCount > 0 ? (fillerCount / wordCount) * 100 : 0

  return { wordCount, fillerCount, fillerRate }
}