import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/context/AuthContext"
import { Avatar } from "@/components/Avatar"
import { AVATAR_COLORS } from "@/lib/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function Profile() {
  const { user, refreshUser } = useAuth()

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "")
  const [avatarColor, setAvatarColor] = useState(user?.user_metadata?.avatar_color || null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState(null)

  async function handleSave() {
    setIsSaving(true)
    setSavedMessage(null)

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, avatar_color: avatarColor },
    })

    if (!error) {
      await refreshUser() // force every component reading useAuth() to update now
    }

    setIsSaving(false)
    setSavedMessage(error ? "Couldn't save. Try again." : "Saved.")
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <p className="text-xs font-medium tracking-[0.2em] uppercase text-neutral-500 mb-2">
        Account
      </p>
      <h1
        className="text-3xl font-bold tracking-tight mb-8"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Your Profile
      </h1>

      <Card className="bg-neutral-900 border-neutral-800 rounded-3xl">
        <CardContent className="flex flex-col gap-6 p-8">
          <div className="flex items-center gap-4">
            <Avatar name={fullName || user?.email} color={avatarColor} size={64} />
            <div>
              <p className="text-sm text-neutral-400">Signed in as</p>
              <p className="text-sm text-neutral-200">{user?.email}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-400">Display Name</label>
            <input
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-neutral-800/60 border border-neutral-700 rounded-lg px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-400/20 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-400">Avatar Color</label>
            <div className="flex gap-3">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setAvatarColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    avatarColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {savedMessage && <p className="text-sm text-neutral-400">{savedMessage}</p>}

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-fit rounded-full h-11 px-6 bg-neutral-100 hover:bg-white text-neutral-950 disabled:opacity-40"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}