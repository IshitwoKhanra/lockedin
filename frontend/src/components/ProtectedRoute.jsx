import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({children})
{
    const {user,loading}=useAuth()

    if(loading)
    {
        return(
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
                Loading...
            </div>
        )
    }

    if(!user)
    {
        return <Navigate to="/login" replace />
    }
    return children
}