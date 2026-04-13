import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@core/supabase.js'
import { useAppContext } from '@app/AppProviders.jsx'
import Avatar from '@shared/components/ui/Avatar.jsx'

export default function PeoplePanel() {
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const { onlineIds } = useAppContext()
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('friendships')
        .select(`
          id,
          requester:requester_id (id, username, full_name, avatar_url),
          receiver:receiver_id (id, username, full_name, avatar_url)
        `)
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted')
      const list = (data || []).map(f => f.requester.id === user.id ? f.receiver : f.requester)
      // sort online first then alphabetically
      list.sort((a, b) => {
        const aOnline = onlineIds.has(a.id)
        const bOnline = onlineIds.has(b.id)
        if (aOnline && !bOnline) return -1
        if (!aOnline && bOnline) return 1
        return (a.full_name || '').localeCompare(b.full_name || '')
      })
      setFriends(list)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loading...</div>
  if (!friends.length) return <div style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>No friends yet</div>

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {friends.map(f => {
        const isOnline = onlineIds.has(f.id)
        return (
          <div key={f.id} onClick={() => navigate(`/profile/${f.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', cursor: 'pointer', margin: '0 0.35rem', borderRadius: '8px' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar url={f.avatar_url} name={f.full_name} size={34} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', background: isOnline ? '#3ba55c' : '#747f8d', border: '2px solid var(--bg-card)' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.full_name}</div>
              <div style={{ fontSize: '0.72rem', color: isOnline ? '#3ba55c' : 'var(--text-secondary)' }}>{isOnline ? 'Online' : 'Offline'}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
