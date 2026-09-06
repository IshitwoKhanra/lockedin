import { Link, useNavigate } from "react-router-dom"
import { LogOut, History } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/context/AuthContext"
import { getDisplayName } from "@/lib/motivation"
import { Avatar } from "@/components/Avatar"

export function Navbar() {
  const navigate = useNavigate()
  const { user } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate("/login")
  }

  return (
    <nav className="relative z-20 flex items-center justify-between px-6 md:px-10 py-4 bg-neutral-950 border-b border-neutral-800">
      <Link
        to="/"
        className="text-xl font-light tracking-tight text-white text-glow-on-hover"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        lockedin
      </Link>

      <div className="flex items-center gap-5">
        <Link
          to="/history"
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
        >
          <History size={16} />
          Past Interviews
        </Link>

        <Link to="/profile">
          <Avatar
            name={user?.user_metadata?.full_name || getDisplayName(user)}
            color={user?.user_metadata?.avatar_color}
            size={32}
          />
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </nav>
  )
}