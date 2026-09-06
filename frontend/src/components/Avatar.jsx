import { getInitials, getAvatarColor } from "@/lib/avatar"

export function Avatar({ name, color, size = 36 }) {
  const initials = getInitials(name)
  const resolvedColor = color || getAvatarColor(name)

  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-medium shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: resolvedColor,
        fontSize: size * 0.4,
      }}
    >
      {initials}
    </div>
  )
}