export default function Badge({ children, variant = 'default', style = {} }) {
  const variants = {
    default:  { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' },
    accent:   { background: 'var(--accent-subtle)', color: 'var(--accent)' },
    success:  { background: '#d1fae5', color: '#065f46' },
    danger:   { background: '#fee2e2', color: 'var(--danger)' },
    dark:     { background: 'var(--btn-dark)', color: 'var(--btn-dark-text)' },
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '500', ...variants[variant], ...style }}>
      {children}
    </span>
  )
}
