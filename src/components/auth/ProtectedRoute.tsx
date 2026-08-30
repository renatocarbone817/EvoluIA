import { useState, useEffect } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { validateUserAccess } from "@/lib/subscriptionService"
import { Brain } from "lucide-react"
import toast from "react-hot-toast"

export function ProtectedRoute() {
  const { user, professional, loading, signOut } = useAuthStore()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [accessBlocked, setAccessBlocked] = useState(false)

  useEffect(() => {
    async function checkQuota() {
      if (user && professional && professional.role === "professional" && professional.master_id) {
        const check = await validateUserAccess(professional)
        if (!check.allowed) {
          toast.error(check.reason || "Acesso suspenso por limite de plano.", { duration: 6000 })
          await signOut()
          setAccessBlocked(true)
        }
      }
      setCheckingAccess(false)
    }

    if (!loading && user) {
      checkQuota()
    } else if (!loading) {
      setCheckingAccess(false)
    }
  }, [user, professional, loading])

  if (loading || checkingAccess) {
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

  if (!user || accessBlocked) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
