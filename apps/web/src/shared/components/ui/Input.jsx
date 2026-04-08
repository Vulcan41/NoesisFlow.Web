export default function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  fullWidth = true,
  multiline = false,
  rows = 3,
  style = {},
  ...props
}) {
  const base = {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--input-border)',
    borderRadius: 'var(--radius)',
    background: 'var(--input-bg)',
    color: 'var(--text)',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
    width: fullWidth ? '100%' : 'auto',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
    opacity: disabled ? 0.5 : 1,
    resize: multiline ? 'vertical' : 'none',
  }

  if (multiline) return (
    <textarea placeholder={placeholder} value={value} onChange={onChange}
      disabled={disabled} rows={rows}
      style={base} {...props} />
  )

  return (
    <input type={type} placeholder={placeholder} value={value}
      onChange={onChange} disabled={disabled}
      style={{ ...base, ...style }} {...props} />
  )
}
