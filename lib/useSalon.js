'use client'
import { useState, useEffect } from 'react'
import { createClient } from './supabase'

const ADMIN_EMAILS = ['otaviocarvalhopereira29@gmail.com']

export function useSalon() {
  const [salon,           setSalon]           = useState(null)
  const [user,            setUser]            = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [isAdmin,         setIsAdmin]         = useState(false)
  const [adminLevel,      setAdminLevel]      = useState(null)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceName, setMaintenanceName] = useState('')
  const sb = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await sb.auth.getUser()
      if (!u) { setLoading(false); return }

      setUser(u)
      const admin = ADMIN_EMAILS.includes(u.email)
      setIsAdmin(admin)

      // Busca nível do admin
      if (admin) {
        const { data: adminData } = await sb.from('admin_emails').select('level').eq('email', u.email).single()
        setAdminLevel(adminData?.level || 'gestor')
      }

      let targetSalon = null

      // Modo manutenção: admin acessando salão de outro
      if (admin) {
        try {
          const raw = typeof window !== 'undefined' ? sessionStorage.getItem('ms_maintenance') : null
          if (raw) {
            const maint = JSON.parse(raw)
            if (maint?.salonId) {
              const { data: ms } = await sb.from('salons').select('*').eq('id', maint.salonId).single()
              if (ms) {
                targetSalon = ms
                setMaintenanceMode(true)
                setMaintenanceName(ms.name || maint.salonName || '')
              }
            }
          }
        } catch(e) {}
      }

      // Se não está em manutenção, carrega o salão do usuário
      if (!targetSalon) {
        const { data: s } = await sb.from('salons')
          .select('*').eq('owner_id', u.id).eq('deleted_at', null)
          .maybeSingle()
        // fallback sem deleted_at filter
        const salon = s || (await sb.from('salons').select('*').eq('owner_id', u.id).maybeSingle()).data
        targetSalon = salon
        setMaintenanceMode(false)
        setMaintenanceName('')
      }

      setSalon(targetSalon)
      setLoading(false)
    }
    load()
  }, [])

  const exitMaintenance = () => {
    if (typeof window !== 'undefined') sessionStorage.removeItem('ms_maintenance')
    window.location.href = '/admin/contratos'
  }

  return { salon, user, loading, isAdmin, adminLevel, maintenanceMode, maintenanceName, exitMaintenance }
}
