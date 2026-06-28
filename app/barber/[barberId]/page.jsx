'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { bookingURL } from '../../../lib/config'

function Avatar({ name, color, size = 96 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: color || '#1B3057',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 800, color: '#fff',
      border: '3px solid rgba(255,255,255,.2)', flexShrink: 0,
      fontFamily: 'Inter, sans-serif',
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  )
}

export default function BarberProfilePage({ params }) {
  const { barberId } = params
  const sb = createClient()

  const [barber,   setBarber]   = useState(null)
  const [salon,    setSalon]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    sb.rpc('get_barber_profile', { barber_uuid: barberId })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          setNotFound(true)
        } else {
          const row = data[0]
          setBarber({ name: row.barber_name, avatar: row.barber_avatar, color: row.barber_color })
          setSalon({ id: row.salon_id, name: row.salon_name, logo: row.salon_logo })
        }
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B1E3D' }}>
      <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>Carregando...</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0B1E3D', padding: 20 }}>
      <div style={{ fontFamily: 'Dancing Script, cursive', fontSize: 36, color: '#fff', marginBottom: 8 }}>Meu Salão</div>
      <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>Barbeiro não encontrado.</div>
    </div>
  )

  const bookLink = bookingURL(salon.id, barberId)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#0B1E3D,#1E3A6E)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      fontFamily: 'Inter, -apple-system, sans-serif',
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;600;700;800&display=swap')`}</style>

      {/* Card principal */}
      <div style={{
        background: '#fff', borderRadius: 24, padding: '40px 28px',
        maxWidth: 380, width: '100%', textAlign: 'center',
        boxShadow: '0 24px 60px rgba(0,0,0,.35)',
      }}>

        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          {barber.avatar ? (
            <div style={{ width: 96, height: 96, borderRadius: 48, overflow: 'hidden', border: `4px solid ${barber.color || '#1B3057'}` }}>
              <img src={barber.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={barber.name} />
            </div>
          ) : (
            <Avatar name={barber.name} color={barber.color} size={96} />
          )}
        </div>

        {/* Nome e salão */}
        <div style={{ fontSize: 26, fontWeight: 800, color: '#0B1E3D', marginBottom: 4 }}>{barber.name}</div>
        <div style={{
          display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#64748B',
          background: '#F1F5F9', borderRadius: 20, padding: '4px 14px', marginBottom: 28,
          letterSpacing: '.3px', textTransform: 'uppercase',
        }}>
          {salon.name}
        </div>

        {/* Botão agendar */}
        <a
          href={bookLink}
          style={{
            display: 'block', padding: '16px', borderRadius: 14,
            background: '#1B3057', color: '#fff',
            fontSize: 16, fontWeight: 800, textDecoration: 'none',
            marginBottom: 12, transition: 'opacity .15s',
          }}
        >
          Agendar agora
        </a>

        {/* Botão WhatsApp se quiser contato direto */}
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>
          Agendamento online via Meu Salão
        </div>
      </div>

      {/* Marca */}
      <div style={{ marginTop: 32, fontFamily: 'Dancing Script, cursive', fontSize: 18, color: 'rgba(255,255,255,.3)' }}>
        Meu Salão by Whatsale
      </div>
    </div>
  )
}
