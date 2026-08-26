import { useEffect } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { Brain } from "lucide-react"

export function ProtectedRoute() {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-foreground rounded-xl flex items-center justify-center mx-auto animate-pulse">
            <Brain className="w-7 h-7 text-background" />
          </div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
