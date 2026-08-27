import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react-hot-toast"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppLayout } from "@/components/layout/AppLayout"

import { LoginPage } from "@/pages/auth/LoginPage"
import { RegisterPage } from "@/pages/auth/RegisterPage"
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage"

import { DashboardPage } from "@/pages/dashboard/DashboardPage"
import { ChildrenPage } from "@/pages/children/ChildrenPage"
import { ChildProfilePage } from "@/pages/children/ChildProfilePage"
import { AppointmentsPage } from "@/pages/appointments/AppointmentsPage"
import { ActiveSessionPage } from "@/pages/sessions/ActiveSessionPage"
import { GuardiansPage } from "@/pages/guardians/GuardiansPage"
import { FinancialPage } from "@/pages/financial/FinancialPage"
import { ReportsPage } from "@/pages/reports/ReportsPage"
import { SettingsPage } from "@/pages/settings/SettingsPage"
import { PublicReceiptPage } from "@/pages/financial/PublicReceiptPage"
import { BibliotecaPage } from "@/pages/biblioteca/BibliotecaPage"

const queryClient = new QueryClient()

export function App() {
  const { setUser, setProfessional, setLoading, fetchProfessional } = useAuthStore()

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || "" })
        fetchProfessional(session.user.id).finally(() => setLoading(false))
      } else {
        setUser(null)
        setProfessional(null)
        setLoading(false)
      }
    })

    // 2. Auth state changes listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || "" })
          await fetchProfessional(session.user.id)
        } else {
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
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
          <Route path="/recibo/:id" element={<PublicReceiptPage />} />
          <Route path="/comprovante/:id" element={<PublicReceiptPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/agenda" element={<AppointmentsPage />} />
              <Route path="/criancas" element={<ChildrenPage />} />
              <Route path="/criancas/:id" element={<ChildProfilePage />} />
              <Route path="/atendimento/:appointmentId" element={<ActiveSessionPage />} />
              <Route path="/atendimento/nova/:childId" element={<ActiveSessionPage />} />
              <Route path="/responsaveis" element={<GuardiansPage />} />
              <Route path="/financeiro" element={<FinancialPage />} />
              <Route path="/relatorios" element={<ReportsPage />} />
              <Route path="/biblioteca" element={<BibliotecaPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Root Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
export default App
