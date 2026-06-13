'use client'
import { useState, useEffect } from 'react'
import { createClient } from './supabase'

export function useSalon() {
  const [salon, setSalon] = useState(null)
  const [user, setUser]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setUser(user)
      const { data } = await sb
        .from('salons')
        .select('*')
        .eq('owner_id', user.id)
        .single()
      setSalon(data)
      setLoading(false)
    })
  }, [])

  return { salon, user, loading }
}
