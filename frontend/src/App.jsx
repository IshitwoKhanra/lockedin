import { Routes, Route } from "react-router-dom"
import { Login } from "@/components/Login"
import { ResumeUpload } from "@/components/ResumeUpload"
import { InterviewScreen } from "@/components/InterviewScreen"
import { ReportView } from "@/components/ReportView"
import { PastInterviews } from "@/components/PastInterviews"
import { Profile } from "@/components/Profile"
import { ProtectedLayout } from "@/components/ProtectedLayout"

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Every route nested inside here shares one ProtectedLayout --
          one auth check, one Navbar, rendered once. */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<ResumeUpload />} />
        <Route path="/interview/:sessionId" element={<InterviewScreen />} />
        <Route path="/report/:sessionId" element={<ReportView />} />
        <Route path="/history" element={<PastInterviews />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default App