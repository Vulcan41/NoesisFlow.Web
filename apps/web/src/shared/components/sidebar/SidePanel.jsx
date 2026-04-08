import FriendsList from './FriendsList.jsx'

export default function SidePanel({ activeSection, collapsed, onToggleCollapse }) {
  return (
    <div style={{ width: collapsed ? '0px' : '240px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden', transition: 'width 0.2s ease', position: 'relative' }}>
      {!collapsed && (
        <>
          <div style={{ padding: '0.85rem 1rem 0.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text)' }}>
              {activeSection === 'friends' ? 'Direct Messages' : ''}
            </span>
            <button onClick={onToggleCollapse} title="Collapse panel"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1rem', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
              ‹
            </button>
          </div>
          {activeSection === 'friends' && <FriendsList collapsed={false} />}
        </>
      )}
    </div>
  )
}
