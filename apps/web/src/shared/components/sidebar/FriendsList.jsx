import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@core/supabase.js'
import { useAppContext } from '@app/AppProviders.jsx'
import Avatar from '@shared/components/ui/Avatar.jsx'

export default function FriendsList() {
  const [friends, setFriends] = useState([])
  const [convMap, setConvMap] = useState({}) // friendId -> conversationId
  const [unreadMap, setUnreadMap] = useState({}) // friendId -> boolean
  const [currentUserId, setCurrentUserId] = useState(null)
  const [justMovedId, setJustMovedId] = useState(null)
  const { onlineIds } = useAppContext()
  const channelRef = useRef(null)
  const msgChannelRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)
      await load(user.id)
      setupPresence(user.id)
      setupRealtimeMessages(user.id)
    }
    init()
    return () => {
      channelRef.current?.unsubscribe()
      msgChannelRef.current?.unsubscribe()
    }
  }, [])

  async function load(userId) {
    // Load accepted friendships
    const { data: friendships } = await supabase
      .from('friendships')
      .select(`
        id,
        requester:requester_id (id, username, full_name, avatar_url),
        receiver:receiver_id (id, username, full_name, avatar_url)
      `)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted')
    if (!friendships) return

    const friendList = friendships.map(f =>
      f.requester.id === userId ? f.receiver : f.requester
    )

    // Load all conversations the user is in
    const { data: myParticipations } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at, conversations(id, last_message_at)')
      .eq('user_id', userId)

    const myConvIds = myParticipations?.map(p => p.conversation_id) ?? []

    // For each conversation, find the other participant
    const { data: otherParticipants } = myConvIds.length ? await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', myConvIds)
      .neq('user_id', userId) : { data: [] }

    // Build maps
    const friendToConv = {} // friendId -> conversationId
    const convToTime = {} // conversationId -> last_message_at

    myParticipations?.forEach(p => {
      convToTime[p.conversation_id] = p.conversations?.last_message_at || ''
    })
    otherParticipants?.forEach(p => {
      friendToConv[p.user_id] = p.conversation_id
    })

    // Build unread map
    const unreadMap = {}
    myParticipations?.forEach(p => {
      const lastMsg = p.conversations?.last_message_at
      const lastRead = p.last_read_at
      const friendId = Object.keys(friendToConv).find(fId => friendToConv[fId] === p.conversation_id)
      if (friendId) {
        unreadMap[friendId] = lastMsg && (!lastRead || new Date(lastMsg) > new Date(lastRead))
      }
    })
    setUnreadMap(unreadMap)

    // Filter to only conversations with at least one message
    const friendsWithConversations = friendList.filter(f => {
      const convId = friendToConv[f.id]
      return convId && convToTime[convId]
    })
    friendsWithConversations.sort((a, b) => {
      const aTime = convToTime[friendToConv[a.id]] || ''
      const bTime = convToTime[friendToConv[b.id]] || ''
      return new Date(bTime) - new Date(aTime)
    })

    setFriends(friendsWithConversations)
    setConvMap(friendToConv)
  }

  function setupPresence(userId) {
    channelRef.current = supabase.channel(`friends-presence-${userId}`, {
      config: { presence: { key: userId } }
    })
    channelRef.current.subscribe()
  }

  function setupRealtimeMessages(userId) {
    msgChannelRef.current = supabase
      .channel('sidebar-new-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, payload => {
        const convId = payload.new.conversation_id
        // Find which friend this conversation belongs to
        setConvMap(prevConvMap => {
          // Find friendId whose convId matches
          const friendId = Object.keys(prevConvMap).find(fId => prevConvMap[fId] === convId)
          if (!friendId) return prevConvMap

          // Move that friend to top with animation
          setFriends(prev => {
            const idx = prev.findIndex(f => f.id === friendId)
            if (idx <= 0) return prev // already at top
            const updated = [...prev]
            const [friend] = updated.splice(idx, 1)
            updated.unshift(friend)
            setJustMovedId(friendId)
            setTimeout(() => setJustMovedId(null), 800)
            return updated
          })

          return prevConvMap
        })
      })
      .subscribe()
  }

  function handleFriendClick(friendId) {
    navigate(`/messages?userId=${friendId}`)
  }

  if (!friends.length) return (
    <div style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>No messages yet</div>
  )

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {friends.map(f => (
        <FriendRow key={f.id} friend={f} online={onlineIds.has(f.id)} onClick={() => handleFriendClick(f.id)} justMoved={justMovedId === f.id} unread={!!unreadMap[f.id]} />
      ))}
    </div>
  )
}

function FriendRow({ friend, online, onClick, justMoved, unread }) {
  return (
    <div onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.75rem', cursor: 'pointer', borderRadius: '6px', margin: '0 0.5rem 0.1rem', transition: 'background 0.15s, transform 0.3s', background: justMoved ? 'var(--bg-secondary)' : 'transparent', transform: justMoved ? 'translateX(4px)' : 'translateX(0)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
      onMouseLeave={e => { if (!justMoved) e.currentTarget.style.background = 'transparent' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar url={friend.avatar_url} name={friend.full_name} size={32} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', background: online ? '#3ba55c' : '#747f8d', border: '2px solid var(--bg-card)' }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: unread ? '700' : '500', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{friend.full_name}</div>
        <div style={{ fontSize: '0.72rem', color: online ? '#3ba55c' : 'var(--text-secondary)' }}>{online ? 'Online' : 'Offline'}</div>
      </div>
      {unread && (
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e53e3e', flexShrink: 0 }} />
      )}
    </div>
  )
}
