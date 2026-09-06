// Splits a message's raw text into an array of segments, each either
// { type: "text", content } or { type: "code", language, content }.
// Looks for standard markdown fenced code blocks: ```language\n...\n```
export function parseCodeBlocks(text) {
  if (!text) return []

  const segments = []
  // Capture groups: (1) optional language name right after the opening
  // ```, (2) everything up to the closing ```. [\s\S] matches any
  // character INCLUDING newlines (plain '.' doesn't match newlines by
  // default), which is required since code blocks span multiple lines.
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g

  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Everything between the end of the previous match (or the start of
    // the string) and the start of this one is plain text.
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) })
    }

    segments.push({
      type: "code",
      language: match[1] || "text",
      content: match[2].trim(),
    })

    lastIndex = codeBlockRegex.lastIndex
  }

  // Anything left after the last code block (or the whole string, if
  // there were no code blocks at all) is plain text.
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) })
  }

  return segments
}