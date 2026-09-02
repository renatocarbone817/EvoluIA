import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react-hot-toast"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { trackPageView } from "@/lib/analyticsTracker"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppLayout } from "@/components/layout/AppLayout"

import { LoginPage } from "@/pages/auth/LoginPage"
import { RegisterPage } from "@/pages/auth/RegisterPage"
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage"
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage"

import { DashboardPage } from "@/pages/dashboard/DashboardPage"
import { ChildrenPage } from "@/pages/children/ChildrenPage"
import { ChildProfilePage } from "@/pages/children/ChildProfilePage"
import { AppointmentsPage } from "@/pages/appointments/AppointmentsPage"
import { ActiveSessionPage } from "@/pages/sessions/ActiveSessionPage"
import { ActiveInterventionSessionPage } from "@/pages/sessions/ActiveInterventionSessionPage"
import { GuardiansPage } from "@/pages/guardians/GuardiansPage"
import { FinancialPage } from "@/pages/financial/FinancialPage"
import { ReportsPage } from "@/pages/reports/ReportsPage"
import { SettingsPage } from "@/pages/settings/SettingsPage"
import { PlanPage } from "@/pages/plan/PlanPage"
import { PublicReceiptPage } from "@/pages/financial/PublicReceiptPage"
import { BibliotecaPage } from "@/pages/biblioteca/BibliotecaPage"
import { SuperAdminPage } from "@/pages/admin/SuperAdminPage"
import { LandingPage } from "@/pages/landing/LandingPage"
import { MobilePhotoCapturePage } from "@/pages/sessions/MobilePhotoCapturePage"

const queryClient = new QueryClient()

// Coletor automático de telemetria de páginas (100% real)
function AnalyticsTracker() {
  const location = useLocation()
  const { user } = useAuthStore()

  useEffect(() => {
    trackPageView(location.pathname, user?.email)
  }, [location.pathname, user?.email])

  return null
}

export function App() {
  const { setUser, setProfessional, setLoading, fetchProfessional } = useAuthStore()

  useEffect(() => {
    // Auth state changes listener (Manipula INITIAL_SESSION no F5 e evita re-renders no Alt+Tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const currentUser = useAuthStore.getState().user
          // Se o usuário ainda não estiver na memória (ex: F5) ou mudou de conta
          if (!currentUser || currentUser.id !== session.user.id) {
            setUser({ id: session.user.id, email: session.user.email || "" })
            await fetchProfessional(session.user.id)
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null)
          setProfessional(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AnalyticsTracker />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: "#19323A",
              color: "#FFFFFF",
              borderRadius: "14px",
              fontSize: "13px",
              fontWeight: "700",
              padding: "12px 18px",
              border: "1.5px solid #245C6B",
              boxShadow: "0 10px 30px -5px rgba(25, 50, 58, 0.25)",
            },
            success: {
              iconTheme: {
                primary: "#63C7B2",
                secondary: "#19323A",
              },
            },
            error: {
              iconTheme: {
                primary: "#D96C6C",
                secondary: "#19323A",
              },
            },
          }}
        />
        <Routes>
          {/* Public Landing & Marketing */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/apresentacao" element={<LandingPage />} />
          <Route path="/planos" element={<LandingPage />} />

          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
          <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route path="/recibo/:id" element={<PublicReceiptPage />} />
          <Route path="/comprovante/:id" element={<PublicReceiptPage />} />
          <Route path="/captura/:uploadId" element={<MobilePhotoCapturePage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/agenda" element={<AppointmentsPage />} />
              <Route path="/criancas" element={<ChildrenPage />} />
              <Route path="/criancas/:id" element={<ChildProfilePage />} />
              <Route path="/atendimento/:appointmentId" element={<ActiveSessionPage />} />
              <Route path="/atendimento/nova/:childId" element={<ActiveSessionPage />} />
              <Route path="/atendimento/intervencao/:appointmentId" element={<ActiveInterventionSessionPage />} />
              <Route path="/atendimento/intervencao/nova/:childId" element={<ActiveInterventionSessionPage />} />
              <Route path="/responsaveis" element={<GuardiansPage />} />
              <Route path="/financeiro" element={<FinancialPage />} />
              <Route path="/relatorios" element={<ReportsPage />} />
              <Route path="/biblioteca" element={<BibliotecaPage />} />
              <Route path="/meu-plano" element={<PlanPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Super Admin / Painel do Dono (Rota Secreta com Login Exclusivo Próprio) */}
          <Route path="/admin" element={<SuperAdminPage />} />
          <Route path="/painel-dono" element={<SuperAdminPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
export default App
