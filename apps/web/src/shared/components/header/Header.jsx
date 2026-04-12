import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '@features/auth/authService.js'
import { supabase } from '@core/supabase.js'
import { useAppContext } from '@app/AppProviders.jsx'
import Avatar from '@shared/components/ui/Avatar.jsx'
import { motion } from 'framer-motion'

export default function Header() {
  const { profile } = useAppContext()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [ping, setPing] = useState(null)
  const [connType, setConnType] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (conn) {
      setConnType(conn.effectiveType)
      conn.addEventListener('change', () => setConnType(conn.effectiveType))
    }
    async function measurePing() {
      try {
        const start = performance.now()
        await fetch('https://noesisflowapi-production.up.railway.app/api/health', { cache: 'no-store' })
        setPing(Math.round(performance.now() - start))
      } catch { setPing(null) }
    }
    measurePing()
    const interval = setInterval(measurePing, 30000)
    return () => clearInterval(interval)
  }, [])

  function getQuality() {
    if (ping === null) return { color: '#747f8d', label: 'Offline', bar: 0 }
    if (ping < 80) return { color: '#3ba55c', label: 'Excellent', bar: 3 }
    if (ping < 200) return { color: '#f0a500', label: 'Good', bar: 2 }
    if (ping < 500) return { color: '#e67e22', label: 'Fair', bar: 1 }
    return { color: '#e53e3e', label: 'Poor', bar: 0 }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const quality = getQuality()

  return (
    <header style={{ height: '40px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', background: 'var(--bg-card)', flexShrink: 0, zIndex: 100 }}>
      <img src="/assets/logo_5.png" alt="Noesis" onClick={() => navigate('/home')} style={{ height: '18px', cursor: 'pointer', objectFit: 'contain' }} />
      <SearchBar />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.95rem' }}>
        <ConnectionIndicator ping={ping} quality={quality} connType={connType} />
        {profile && <DiamondCredits credits={profile.credits ?? 0} />}
        <div style={{ position: 'relative' }}>
          <div onClick={() => setDropdownOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '20px', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Avatar url={profile?.avatar_url} name={profile?.username} size={26} />
            <span style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.username ?? ''}</span>
          </div>
          {dropdownOpen && (
            <div style={{ position: 'absolute', right: 0, top: '38px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow)', minWidth: '160px', zIndex: 200 }}>
              <div onClick={() => { navigate('/profile'); setDropdownOpen(false) }} style={{ padding: '0.7rem 1rem', cursor: 'pointer', color: 'var(--text)', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Profile
              </div>
              <div onClick={handleSignOut} style={{ padding: '0.7rem 1rem', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.9rem' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Log out
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id))
  }, [])

  useEffect(() => {
    if (!currentUserId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('id', currentUserId)
        .limit(8)
      // For each result, count mutual friends
      const withMutuals = await Promise.all((data || []).map(async user => {
        const { count: myFriends } = await supabase
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
          .eq('status', 'accepted')
        const { data: theirFriendships } = await supabase
          .from('friendships')
          .select('requester_id, receiver_id')
          .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('status', 'accepted')
        const myFriendIds = new Set()
        const theirFriendIds = new Set(
          (theirFriendships || []).flatMap(f => [f.requester_id, f.receiver_id]).filter(id => id !== user.id)
        )
        const { data: myFriendships } = await supabase
          .from('friendships')
          .select('requester_id, receiver_id')
          .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
          .eq('status', 'accepted')
        ;(myFriendships || []).forEach(f => {
          myFriendIds.add(f.requester_id === currentUserId ? f.receiver_id : f.requester_id)
        })
        const mutuals = [...myFriendIds].filter(id => theirFriendIds.has(id)).length
        return { ...user, mutuals }
      }))
      setResults(withMutuals)
      setOpen(true)
      setLoading(false)
    }, 300)
  }, [query, currentUserId])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(userId) {
    setQuery('')
    setOpen(false)
    setResults([])
    navigate(`/profile/${userId}`)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '260px' }}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { if (results.length) setOpen(true) }}
        placeholder="Search users..."
        style={{ width: '100%', padding: '0.35rem 1rem', border: '1px solid var(--border)', borderRadius: '20px', outline: 'none', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box' }}
      />
      {open && (
        <div style={{ position: 'absolute', top: '36px', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: 'var(--shadow)', zIndex: 500, overflow: 'hidden' }}>
          {loading && (
            <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Searching...</div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No users found</div>
          )}
          {!loading && results.map(user => (
            <div key={user.id} onClick={() => handleSelect(user.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Avatar url={user.avatar_url} name={user.full_name} size={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.full_name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {user.mutuals > 0 ? `${user.mutuals} mutual friend${user.mutuals > 1 ? 's' : ''}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DiamondCredits({ credits }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'default', position: 'relative' }}>
      <motion.div
        animate={{ rotate: hovered ? 360 : 0, scale: hovered ? 1.2 : 1 }}
        transition={{ rotate: { duration: 0.5, ease: 'easeInOut' }, scale: { duration: 0.2 } }}
        style={{ width: '18px', height: '18px', position: 'relative' }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <motion.path
            d="M12 2L2 9l10 13L22 9z"
            fill="url(#diamondGrad)"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.5"
            animate={{ filter: hovered ? 'brightness(1.4)' : 'brightness(1)' }}
          />
          <motion.path
            d="M2 9h20M12 2L6 9l6 13 6-13z"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="0.5"
            fill="none"
          />
          <defs>
            <linearGradient id="diamondGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="50%" stopColor="#60c8f5" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
      <motion.span
        animate={{ color: hovered ? '#a78bfa' : 'var(--text)' }}
        transition={{ duration: 0.2 }}
        style={{ fontSize: '0.85rem', fontWeight: '700' }}>
        {credits}
      </motion.span>
      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', boxShadow: 'var(--shadow)', zIndex: 300 }}>
          Noesis Credits
        </motion.div>
      )}
    </motion.div>
  )
}

function ConnectionIndicator({ ping, quality, connType }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', cursor: 'default', height: '16px' }}>
        {[1, 2, 3].map(level => (
          <div key={level} style={{ width: '4px', height: `${4 + level * 4}px`, borderRadius: '2px', background: quality.bar >= level ? quality.color : 'var(--border)', transition: 'background 0.3s' }} />
        ))}
      </div>
      {hovered && (
        <div style={{ position: 'absolute', top: '28px', right: '0', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem 0.85rem', boxShadow: 'var(--shadow)', zIndex: 300, whiteSpace: 'nowrap', minWidth: '160px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: quality.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)' }}>{quality.label}</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{ping !== null ? `${ping}ms latency` : 'Cannot reach server'}</div>
          {connType && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Network: {connType.toUpperCase()}</div>}
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem', borderTop: '1px solid var(--border)', paddingTop: '0.35rem' }}>Server: Railway API</div>
        </div>
      )}
    </div>
  )
}
