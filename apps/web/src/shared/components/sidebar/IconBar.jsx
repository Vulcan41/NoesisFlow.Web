import { motion } from 'framer-motion'
import { useAppContext } from '@app/AppProviders.jsx'

const icons = [
  { id: 'home', icon: '/assets/home.png', iconSelected: '/assets/home_selected.png', label: 'Dashboard' },
  { id: 'notifications', icon: '/assets/notifications_1.png', iconSelected: '/assets/notifications.png', label: 'Notifications' },
  { id: 'friends', icon: '/assets/chat_1.png', iconSelected: '/assets/chat_2.png', label: 'Messages' },
  { id: 'people', icon: '/assets/friends.png', iconSelected: '/assets/friends_selected.png', label: 'Friends' },
  { id: 'settings', icon: '/assets/settings.png', iconSelected: '/assets/settings_selected.png', label: 'Settings' },
]

export default function IconBar({ activeSection, onSelect }) {
  const { unreadMessages, unreadNotifications } = useAppContext()

  return (
    <div style={{ width: '48px', background: 'var(--bg)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '1rem', paddingBottom: '1rem', gap: '0.1rem', flexShrink: 0 }}>
      {icons.map(icon => (
        <IconButton
          key={icon.id}
          icon={icon}
          isActive={activeSection === icon.id}
          onSelect={onSelect}
          badge={icon.id === 'friends' ? unreadMessages : icon.id === 'notifications' ? unreadNotifications : 0}
        />
      ))}
    </div>
  )
}

function IconButton({ icon, isActive, onSelect, badge }) {
  return (
    <motion.button
      onClick={() => onSelect(icon.id)}
      whileTap={{ scale: 0.9 }}
      style={{ position: 'relative', width: '40px', height: '40px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none', borderRadius: '10px' }}>

      {isActive && (
        <motion.div
          layoutId="activeBar"
          style={{ position: 'absolute', left: '-8px', top: '25%', width: '3px', height: '50%', borderRadius: '0 3px 3px 0', background: 'var(--icon-active-bg)' }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}

      <motion.div
        animate={{ background: isActive ? 'var(--bg-secondary)' : 'transparent' }}
        transition={{ duration: 0.2 }}
        whileHover={{ background: 'var(--bg-secondary)' }}
        style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.img
          src={isActive ? icon.iconSelected : icon.icon}
          alt={icon.label}
          animate={{ opacity: isActive ? 1 : 0.45, scale: isActive ? 1.05 : 1 }}
          transition={{ duration: 0.15 }}
          style={{ width: '18px', height: '18px', objectFit: 'contain' }}
        />
        {badge > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ position: 'absolute', top: '5px', right: '5px', minWidth: '10px', height: '10px', borderRadius: '50%', background: '#E03C14', border: '2px solid var(--bg)' }}
          />
        )}
      </motion.div>
    </motion.button>
  )
}
