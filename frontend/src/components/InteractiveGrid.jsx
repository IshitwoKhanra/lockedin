import { useEffect, useRef } from "react"

// A faint dot-grid across the whole background, with a brighter "spotlight"
// copy of the same grid revealed only in a circle around the cursor, via a
// CSS mask. No animation loop needed -- the mask position updates directly
// via a CSS custom property on mousemove, and a short CSS transition
// smooths it out.
export function InteractiveGrid() {
  const spotlightRef = useRef(null)

  useEffect(() => {
    function handleMouseMove(e) {
      if (spotlightRef.current) {
        spotlightRef.current.style.setProperty("--x", `${e.clientX}px`)
        spotlightRef.current.style.setProperty("--y", `${e.clientY}px`)
      }
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const gridStyle = {
    backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
    backgroundSize: "28px 28px",
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* base grid -- always faintly visible everywhere */}
      <div className="absolute inset-0 opacity-[0.04]" style={gridStyle} />

      {/* spotlight grid -- same pattern, but only shown inside a circle
          that follows the cursor, via mask-image */}
      <div
        ref={spotlightRef}
        className="absolute inset-0 opacity-40 transition-[mask-position,-webkit-mask-position] duration-100 ease-out"
        style={{
          ...gridStyle,
          maskImage:
            "radial-gradient(circle 220px at var(--x, 50%) var(--y, 50%), black 0%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(circle 220px at var(--x, 50%) var(--y, 50%), black 0%, transparent 100%)",
        }}
      />
    </div>
  )
}