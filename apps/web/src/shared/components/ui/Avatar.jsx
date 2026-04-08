export default function Avatar({ url, name, size = 36, radius = '50%' }) {
  const initial = name?.[0]?.toUpperCase() ?? '?'
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: 'var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: size * 0.35, flexShrink: 0 }}>
      {url
        ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initial}
    </div>
  )
}
