import { useEffect, useState, createContext, useContext } from 'react'
import { applyTheme } from '@shared/hooks/useTheme.js'
import { supabase } from '@core/supabase.js'

const AppContext = createContext({})

export function useAppContext() {
  return useContext(AppContext)
}

export default function AppProviders({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'system')
  const [language, setLanguageState] = useState(() => localStorage.getItem('language') || 'en')

  useEffect(() => { applyTheme(theme) }, [theme])

  function setTheme(t) {
    localStorage.setItem('theme', t)
    setThemeState(t)
    applyTheme(t)
  }

  function setLanguage(l) {
    localStorage.setItem('language', l)
    setLanguageState(l)
  }

  async function syncPreferencesFromDB() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('theme, language').eq('id', user.id).single()
    if (data?.theme) setTheme(data.theme)
    if (data?.language) setLanguage(data.language)
  }

  return (
    <AppContext.Provider value={{ theme, setTheme, language, setLanguage, syncPreferencesFromDB }}>
      {children}
    </AppContext.Provider>
  )
}
