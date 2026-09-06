// Purely decorative -- three large, blurred, drifting shapes behind the
// actual content. Grayscale, but intense enough (opacity + size) to
// actually read as movement, not just faint texture.
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-15%] left-[-10%] w-[50rem] h-[50rem] rounded-full bg-neutral-500/40 blur-[100px] animate-drift" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[46rem] h-[46rem] rounded-full bg-neutral-400/30 blur-[110px] animate-drift-slow" />
      <div className="absolute top-[25%] right-[10%] w-[30rem] h-[30rem] rounded-full bg-neutral-300/25 blur-[90px] animate-drift" />
    </div>
  )
}