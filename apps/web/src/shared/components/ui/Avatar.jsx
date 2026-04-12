export default function Avatar({ url, name, size = 36, radius = '50%', style = {} }) {
  const initial = name?.[0]?.toUpperCase() ?? '?'
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', flexShrink: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {url
        ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} crossOrigin="anonymous" />
        : <img src="/assets/user_icon.png" alt="default" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
    </div>
  )
}
