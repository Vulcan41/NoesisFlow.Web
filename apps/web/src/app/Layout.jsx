import { useState } from 'react'
import Header from '@components/header/Header.jsx'
import IconBar from '@shared/components/sidebar/IconBar.jsx'
import SidePanel from '@shared/components/sidebar/SidePanel.jsx'

export default function Layout({ children }) {
  const [activeSection, setActiveSection] = useState('friends')
  const [panelCollapsed, setPanelCollapsed] = useState(false)

  function handleIconSelect(section) {
    if (activeSection === section && !panelCollapsed) {
      setPanelCollapsed(true)
    } else {
      setActiveSection(section)
      setPanelCollapsed(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <IconBar activeSection={panelCollapsed ? null : activeSection} onSelect={handleIconSelect} />
        <SidePanel activeSection={activeSection} collapsed={panelCollapsed} onToggleCollapse={() => setPanelCollapsed(true)} />
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
