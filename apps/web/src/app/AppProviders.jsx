import { createContext, useContext, useEffect, useState } from 'react'
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

  useEffect(() => { applyTheme(theme) }, [theme])

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url, credits').eq('id', user.id).single()
      setProfile(data)
    }
    loadProfile()
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
    const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url, credits').eq('id', user.id).single()
    setProfile(data)
  }

  return (
    <AppContext.Provider value={{ theme, setTheme, language, setLanguage, profile, setProfile, refreshProfile }}>
      {children}
    </AppContext.Provider>
  )
}
