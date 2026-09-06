import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { Navbar } from "@/components/Navbar"

// Combines what ProtectedRoute used to do (redirect if not logged in)
// with rendering the Navbar exactly once, above whichever page is
// currently active -- instead of every individual page needing its own
// copy of the navbar.
export function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Navbar />
      {/* Outlet renders whichever child route currently matches --
          this is where ResumeUpload / InterviewScreen / ReportView
          actually appear. */}
      <Outlet />
    </div>
  )
}