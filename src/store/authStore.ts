import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Professional } from '@/types/database'

interface AuthState {
  user: { id: string; email: string } | null
  professional: Professional | null
  loading: boolean
  setUser: (user: { id: string; email: string } | null) => void
  setProfessional: (professional: Professional | null) => void
  setLoading: (loading: boolean) => void
  fetchProfessional: (userId: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  professional: null,
  loading: true,

  setUser: (user) => set({ user }),
  setProfessional: (professional) => set({ professional }),
  setLoading: (loading) => set({ loading }),

  fetchProfessional: async (userId: string) => {
    try {
      const { data } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (data) {
        set({ professional: data })
        // Se for Master, carregar em cache os membros para compartilhamento bidirecional em tempo real
        if (data.role !== 'professional' || !data.master_id) {
          try {
            const { data: team } = await supabase
              .from('professionals')
              .select('*')
              .eq('master_id', userId)
              .eq('is_active', true)
            if (team) {
              localStorage.setItem(`evoluia_team_members_${userId}`, JSON.stringify(team))
            }
          } catch (err) {
            console.warn('Could not preload team:', err)
          }
        }
      } else {
        const { data: userData } = await supabase.auth.getUser()
        const email = userData.user?.email || ''
        const role = userData.user?.user_metadata?.role || 'master'
        const master_id = userData.user?.user_metadata?.master_id || null
        const allow_master_data_access = userData.user?.user_metadata?.allow_master_data_access || false
        const fullName = userData.user?.user_metadata?.full_name || 'Priscila Carbone'
        const newProf = {
          id: userId,
          full_name: fullName,
          email: email,
          specialty: 'Psicopedagogia',
          role,
          master_id,
          allow_master_data_access,
          is_active: true,
        }
        await supabase.from('professionals').insert(newProf)
        set({ professional: newProf as any })
      }
    } catch (e) {
      console.error(e)
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, professional: null })
  },
}))
