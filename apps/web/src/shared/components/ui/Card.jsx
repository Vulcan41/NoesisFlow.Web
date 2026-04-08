export default function Card({ children, onClick, hoverable = false, style = {} }) {
  const base = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    transition: hoverable ? 'transform 0.15s, box-shadow 0.15s' : 'none',
    cursor: onClick ? 'pointer' : 'default',
  }
  return (
    <div style={{ ...base, ...style }}
      onClick={onClick}
      onMouseEnter={e => { if (hoverable) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}}
      onMouseLeave={e => { if (hoverable) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}}>
      {children}
    </div>
  )
}
