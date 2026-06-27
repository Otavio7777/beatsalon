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
  const [isBarber,        setIsBarber]        = useState(false)
  const [barberData,      setBarberData]      = useState(null)
  // Gestor visualizando como barbeiro
  const [barberViewMode,  setBarberViewMode]  = useState(false)
  const [barberViewName,  setBarberViewName]  = useState('')
  const sb = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await sb.auth.getUser()
      if (!u) { setLoading(false); return }

      setUser(u)
      const admin = ADMIN_EMAILS.includes(u.email)
      setIsAdmin(admin)

      if (admin) {
        const { data: adminData } = await sb.from('admin_emails').select('level').eq('email', u.email).single()
        setAdminLevel(adminData?.level || 'gestor')
      }

      let targetSalon = null

      // Modo manutenção (admin)
      if (admin) {
        try {
          const raw = typeof window !== 'undefined' ? sessionStorage.getItem('ms_maintenance') : null
          if (raw) {
            const maint = JSON.parse(raw)
            if (maint?.salonId) {
              const { data: ms } = await sb.from('salons').select('*').eq('id', maint.salonId).single()
              if (ms) { targetSalon = ms; setMaintenanceMode(true); setMaintenanceName(ms.name || '') }
            }
          }
        } catch(e) {}
      }

      if (!targetSalon) {
        // Dono do salão — pode ter modo "visualizar como barbeiro"
        const { data: s } = await sb.from('salons').select('*').eq('owner_id', u.id).maybeSingle()

        if (s) {
          targetSalon = s

          // Verifica modo barber-view (gestor vendo como barbeiro)
          try {
            const raw = typeof window !== 'undefined' ? sessionStorage.getItem('ms_barber_view') : null
            if (raw) {
              const bv = JSON.parse(raw)
              if (bv?.barberId && bv?.salonId === s.id) {
                const { data: bvBarber } = await sb.from('barbers').select('*').eq('id', bv.barberId).maybeSingle()
                if (bvBarber) {
                  setIsBarber(true)
                  setBarberData(bvBarber)
                  setBarberViewMode(true)
                  setBarberViewName(bvBarber.name || '')
                  setSalon(targetSalon)
                  setMaintenanceMode(false)
                  setMaintenanceName('')
                  setLoading(false)
                  return
                }
              }
            }
          } catch(e) {}

          setIsBarber(false)
          setBarberData(null)
        } else {
          // Verifica se é barbeiro de algum salão
          const { data: barber } = await sb.from('barbers')
            .select('*, salons(*)')
            .eq('email', u.email)
            .eq('active', true)
            .maybeSingle()

          if (barber?.salons) {
            targetSalon = barber.salons
            setIsBarber(true)
            setBarberData(barber)
            if (!barber.user_id) {
              await sb.from('barbers').update({ user_id: u.id }).eq('id', barber.id)
            }
          }
        }
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

  const exitBarberView = () => {
    if (typeof window !== 'undefined') sessionStorage.removeItem('ms_barber_view')
    window.location.href = '/dashboard/equipe'
  }

  return {
    salon, user, loading, isAdmin, adminLevel,
    maintenanceMode, maintenanceName, exitMaintenance,
    isBarber, barberData,
    barberViewMode, barberViewName, exitBarberView,
  }
}
