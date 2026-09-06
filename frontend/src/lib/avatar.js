// A small palette to choose from -- deliberately monochrome-adjacent,
// matching the rest of the app's palette rather than clashing with it.
const AVATAR_COLORS = [
  "#525252", "#6b7280", "#78716c", "#57534e", "#44403c", "#3f3f46",
]

export function getInitials(name) {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}

// Picks a color deterministically from the name, via a very simple hash,
// so the same person always lands on the same color rather than a
// random one changing on every reload.
export function getAvatarColor(seed) {
  if (!seed) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

export { AVATAR_COLORS }