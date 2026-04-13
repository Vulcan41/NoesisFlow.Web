import { motion } from 'framer-motion'
import { useRef } from 'react'

const icons = [
  { id: 'home', icon: '/assets/home.png', iconSelected: '/assets/home_selected.png', label: 'Dashboard' },
  { id: 'notifications', icon: '/assets/notifications_1.png', iconSelected: '/assets/notifications.png', label: 'Notifications' },
  { id: 'friends', icon: '/assets/chat_1.png', iconSelected: '/assets/chat_2.png', label: 'Messages' },
  { id: 'people', icon: '/assets/user_icon.png', iconSelected: '/assets/user_icon.png', label: 'Friends' },
  { id: 'settings', icon: '/assets/settings.png', iconSelected: '/assets/settings_selected.png', label: 'Settings' },
]

export default function IconBar({ activeSection, onSelect }) {
  const barRef = useRef(null)

  return (
    <div
      ref={barRef}
      style={{ width: '52px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '0.75rem', gap: '0.15rem', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>

      {icons.map(icon => (
        <IconButton key={icon.id} icon={icon} isActive={activeSection === icon.id} onSelect={onSelect} />
      ))}
    </div>
  )
}

function IconButton({ icon, isActive, onSelect }) {
  return (
    <motion.button
      onClick={() => onSelect(icon.id)}
      whileTap={{ scale: 0.85 }}
      animate={{
        borderRadius: isActive ? '14px' : '50%',
        background: isActive ? 'var(--icon-active-bg)' : 'transparent',
      }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      style={{ width: '36px', height: '36px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none', position: 'relative', zIndex: 1, flexShrink: 0 }}>
      {isActive && (
        <motion.div
          layoutId="pill"
          style={{ position: 'absolute', inset: 0, borderRadius: '14px', background: 'var(--icon-active-bg)', zIndex: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <motion.img
        src={isActive ? icon.iconSelected : icon.icon}
        alt={icon.label}
        animate={{ scale: isActive ? 1.1 : 1, opacity: isActive ? 1 : 0.55 }}
        transition={{ duration: 0.15 }}
        style={{ width: '20px', height: '20px', objectFit: 'contain', position: 'relative', zIndex: 1 }}
      />
    </motion.button>
  )
}