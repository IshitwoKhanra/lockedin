// Each entry is a function so the name can be dropped in wherever reads
// most naturally. Kept deliberately short -- these render as a large
// display heading, so anything longer wraps to two lines and loses impact.
const MOTIVATIONAL_MESSAGES = [
  (name) => `${name}, every rep gets you closer.`,
  (name) => `Let's turn nerves into knowledge, ${name}.`,
  (name) => `${name}, confidence is practice in disguise.`,
  (name) => `You've got this, ${name}.`,
  (name) => `${name}, the best time to practice is now.`,
  (name) => `Show up, speak up, ${name}.`,
  (name) => `${name}, practiced minds win rooms.`,
  (name) => `One more rep, ${name}.`,
  (name) => `${name}, let's build some clarity.`,
  (name) => `Today's practice, tomorrow's confidence, ${name}.`,
  (name) => `${name}, own the room before you enter it.`,
  (name) => `Let's make hesitation history, ${name}.`,
  (name) => `${name}, great answers are made, not born.`,
  (name) => `Bring your best self, ${name}.`,
  (name) => `${name}, let's sound like you belong.`,
]

export function getRandomMotivationalMessage(name) {
  const template = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]
  return template(name)
}

export function getDisplayName(user) {
  if (!user) return "there"
  const fullName = user.user_metadata?.full_name
  if (fullName) return fullName.split(" ")[0]
  return user.email.split("@")[0]
}