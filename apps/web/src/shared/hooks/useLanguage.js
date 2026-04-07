import { useState } from 'react'

export function useLanguage() {
  const [language, setLanguageState] = useState(() => localStorage.getItem('language') || 'en')

  function setLanguage(lang) {
    localStorage.setItem('language', lang)
    setLanguageState(lang)
  }

  return { language, setLanguage }
}
