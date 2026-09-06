import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"

export function CodeBlock({ language, code }) {
  return (
    <div className="rounded-xl overflow-hidden border border-neutral-800 my-3 bg-[#1e1e1e]">
      {/* Title bar -- mimics a real code editor window: traffic-light
          dots on the left, the detected language on the right. */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
        <span className="text-xs text-neutral-500 font-mono">{language}</span>
      </div>

      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "transparent",
          fontSize: "0.85rem",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}