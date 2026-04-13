import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { applyTheme } from '@shared/hooks/useTheme.js'
import { supabase } from '@core/supabase.js'

const AppContext = createContext({})

export function useAppContext() {
  return useContext(AppContext)
}

export default function AppProviders({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'system')
  const [language, setLanguageState] = useState(() => localStorage.getItem('language') || 'en')
  const [profile, setProfile] = useState(null)
  const [onlineIds, setOnlineIds] = useState(new Set())
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const presenceRef = useRef(null)

  useEffect(() => { applyTheme(theme) }, [theme])

  async function loadUnreadCounts(userId) {
    const { count: notifCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('read', false)
    setUnreadNotifications(notifCount || 0)

    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at, conversations(last_message_at)')
      .eq('user_id', userId)
    const unread = (participations || []).filter(p => {
      const lastMsg = p.conversations?.last_message_at
      const lastRead = p.last_read_at
      if (!lastMsg) return false
      if (!lastRead) return true
      return new Date(lastMsg) > new Date(lastRead)
    }).length
    setUnreadMessages(unread)
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userId = session.user.id
        const { data } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, credits')
          .eq('id', userId)
          .single()
        setProfile(data)
        loadUnreadCounts(userId)

        const unreadChannel = supabase.channel('unread-counts')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
            if (payload.new.receiver_id === userId) setUnreadNotifications(c => c + 1)
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
            loadUnreadCounts(userId)
          })
          .subscribe()

        // setup presence
        if (presenceRef.current) presenceRef.current.unsubscribe()
        presenceRef.current = supabase.channel('global-presence', {
          config: { presence: { key: userId } }
        })
        presenceRef.current
          .on('presence', { event: 'sync' }, () => {
            const state = presenceRef.current.presenceState()
            setOnlineIds(new Set(Object.keys(state)))
          })
          .subscribe(async status => {
            if (status === 'SUBSCRIBED') {
              await presenceRef.current.track({ user_id: userId })
            }
          })
      } else {
        setProfile(null)
        setOnlineIds(new Set())
        setUnreadMessages(0)
        setUnreadNotifications(0)
        presenceRef.current?.unsubscribe()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  function setTheme(t) {
    localStorage.setItem('theme', t)
    setThemeState(t)
    applyTheme(t)
  }

  function setLanguage(l) {
    localStorage.setItem('language', l)
    setLanguageState(l)
  }

  async function refreshProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, credits')
      .eq('id', user.id)
      .single()
    setProfile(data)
  }

  return (
    <AppContext.Provider value={{ theme, setTheme, language, setLanguage, profile, setProfile, refreshProfile, onlineIds, unreadMessages, setUnreadMessages, unreadNotifications, setUnreadNotifications }}>
      {children}
    </AppContext.Provider>
  )
}
