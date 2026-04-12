import { motion } from 'framer-motion'
import { useState } from 'react'

export default function IconBar({ activeSection, onSelect }) {
  const icons = [
    { id: 'home', icon: '/assets/home_icon.png', label: 'Home' },
    { id: 'notifications', icon: '/assets/2222.png', label: 'Notifications' },
    { id: 'friends', icon: '/assets/chat.png', iconSelected: '/assets/chat_selected.png', label: 'Messages' },
    { id: 'settings', icon: '/assets/3333.png', label: 'Settings' },
  ]

  return (
    <div style={{ width: '52px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '0.75rem', gap: '0.15rem', flexShrink: 0 }}>
      {icons.map(icon => (
        <IconButton key={icon.id} icon={icon} isActive={activeSection === icon.id} onSelect={onSelect} />
      ))}
    </div>
  )
}

function IconButton({ icon, isActive, onSelect }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <motion.button
        onClick={() => onSelect(icon.id)}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileTap={{ scale: 0.88 }}
        animate={{
          borderRadius: isActive || hovered ? '12px' : '50%',
          background: isActive ? 'var(--icon-active-bg)' : hovered ? 'var(--bg-card)' : 'transparent',
          boxShadow: isActive ? '0 2px 12px rgba(0,0,0,0.15)' : 'none',
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{ width: '36px', height: '36px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none', position: 'relative', overflow: 'hidden' }}>
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            style={{ position: 'absolute', inset: 0, borderRadius: '12px', background: 'var(--icon-active-bg)', zIndex: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <motion.img
          src={isActive && icon.iconSelected ? icon.iconSelected : icon.icon}
          alt={icon.label}
          animate={{ scale: isActive ? 1.1 : hovered ? 1.05 : 1, opacity: isActive ? 1 : hovered ? 0.9 : 0.65 }}
          transition={{ duration: 0.15 }}
          style={{ width: '18px', height: '18px', objectFit: 'contain', position: 'relative', zIndex: 1 }}
        />
      </motion.button>
      {hovered && !isActive && (
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ position: 'absolute', left: '44px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.78rem', fontWeight: '500', color: 'var(--text)', whiteSpace: 'nowrap', boxShadow: 'var(--shadow)', zIndex: 400, pointerEvents: 'none' }}>
          {icon.label}
        </motion.div>
      )}
    </div>
  )
}