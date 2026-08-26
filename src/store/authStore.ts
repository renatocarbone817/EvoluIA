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
      } else {
        const { data: userData } = await supabase.auth.getUser()
        const email = userData.user?.email || ''
        const fullName = userData.user?.user_metadata?.full_name || 'Priscila Carbone'
        const newProf = {
          id: userId,
          full_name: fullName,
          email: email,
          specialty: 'Psicopedagogia',
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
