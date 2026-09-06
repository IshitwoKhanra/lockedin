import { Card, CardContent } from "@/components/ui/card"
import { CodeBlock } from "@/components/CodeBlock"
import { parseCodeBlocks } from "@/lib/parseCodeBlocks"

export function TranscriptPanel({ transcript }) {
  return (
    <Card className="bg-neutral-900 border-neutral-800 rounded-3xl">
      <CardContent className="p-6">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-neutral-500 mb-4">
          Transcript
        </p>
        <div className="h-[28rem] overflow-y-auto themed-scrollbar flex flex-col gap-3 text-sm leading-relaxed">
          {transcript.length === 0 && (
            <p className="text-neutral-600 italic">
              Nothing yet -- start the interview to begin.
            </p>
          )}
          {transcript.map((entry, i) => {
            const segments = parseCodeBlocks(entry.text)
            return (
              <div key={i}>
                <span className="font-semibold text-neutral-400">
                  {entry.speaker === "user" ? "You: " : "Assistant: "}
                </span>
                {segments.map((segment, j) =>
                  segment.type === "code" ? (
                    <CodeBlock key={j} language={segment.language} code={segment.content} />
                  ) : (
                    <span key={j}>{segment.content}</span>
                  )
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}