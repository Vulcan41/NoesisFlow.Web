import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@core/supabase.js'
import Avatar from '@shared/components/ui/Avatar.jsx'

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [acted, setActed] = useState(new Set())
  const navigate = useNavigate()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('id, type, read, created_at, friendship_id, project_id, sender:sender_id (id, username, full_name, avatar_url)')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase.channel('notifications-panel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        supabase.from('notifications')
          .select('id, type, read, created_at, friendship_id, project_id, sender:sender_id (id, username, full_name, avatar_url)')
          .eq('id', payload.new.id).single()
          .then(({ data }) => { if (data) setNotifications(prev => [data, ...prev]) })
      })
      .subscribe()
    return () => channel.unsubscribe()
  }, [])

  async function handleMarkRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function handleMarkAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('receiver_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function handleAccept(n) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', n.friendship_id)
    if (error) { console.error('accept error:', error); return }
    await handleMarkRead(n.id)
    setActed(prev => new Set([...prev, n.id]))
  }

  async function handleReject(n) {
    await supabase.from('friendships').delete().eq('id', n.friendship_id)
    await handleMarkRead(n.id)
    setActed(prev => new Set([...prev, n.id]))
  }

  if (loading) return <div style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading...</div>

  const unread = notifications.filter(n => !n.read).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {unread > 0 && (
        <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleMarkAllRead}
            style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>
            Mark all read
          </button>
        </div>
      )}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>No notifications</div>
        ) : (
          notifications.map(n => (
            <div key={n.id}
              style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid var(--border)', background: n.read ? 'transparent' : 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: n.type === 'friend_request' && !n.read ? '0.5rem' : 0 }}>
                <Avatar url={n.sender?.avatar_url} name={n.sender?.full_name} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.3 }}>
                    {n.type === 'friend_request' && <><strong>{n.sender?.full_name}</strong> sent you a friend request</>}
                    {n.type === 'friend_accepted' && <><strong>{n.sender?.full_name}</strong> accepted your friend request</>}
                    {!['friend_request', 'friend_accepted'].includes(n.type) && n.type}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{new Date(n.created_at).toLocaleDateString()}</div>
                </div>
                {!n.read && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
              </div>
              {n.type === 'friend_request' && n.friendship_id != null && !acted.has(n.id) && (
                <div style={{ display: 'flex', gap: '0.5rem', paddingLeft: '36px' }}>
                  <button onClick={() => handleAccept(n)} style={{ padding: '0.25rem 0.75rem', background: 'var(--btn-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' }}>Accept</button>
                  <button onClick={() => handleReject(n)} style={{ padding: '0.25rem 0.75rem', background: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}>Reject</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
