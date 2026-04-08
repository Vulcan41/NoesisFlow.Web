import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMySettings, updatePreferences, updatePassword, updateEmail, deleteAccount } from './settingsService.js'
import { signOut } from '@features/auth/authService.js'
import { useAppContext } from '@app/AppProviders.jsx'

const TABS = ['Account', 'Preferences', 'Appearance', 'Privacy', 'Danger Zone']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Account')
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMySettings().then(setSettings).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text)' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <aside style={{ width: '200px', borderRight: '1px solid var(--border)', padding: '1.5rem 1rem', flexShrink: 0 }}>
        <h2 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>Settings</h2>
        {TABS.map(tab => (
          <div key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '0.6rem 0.75rem', borderRadius: '6px', cursor: 'pointer', marginBottom: '0.25rem', background: activeTab === tab ? 'var(--bg-secondary)' : 'transparent', fontWeight: activeTab === tab ? '500' : 'normal', color: tab === 'Danger Zone' ? 'var(--danger)' : 'var(--text)' }}>
            {tab}
          </div>
        ))}
      </aside>
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {activeTab === 'Account' && <AccountTab settings={settings} onUpdate={setSettings} />}
        {activeTab === 'Preferences' && <PreferencesTab settings={settings} onUpdate={setSettings} />}
        {activeTab === 'Appearance' && <AppearanceTab />}
        {activeTab === 'Privacy' && <PrivacyTab settings={settings} onUpdate={setSettings} />}
        {activeTab === 'Danger Zone' && <DangerTab />}
      </main>
    </div>
  )
}

function AccountTab({ settings, onUpdate }) {
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleEmailChange() {
    if (!newEmail) return
    setSaving(true); setError(null); setMessage(null)
    try {
      await updateEmail(newEmail)
      setMessage('Verification email sent to ' + newEmail)
      setNewEmail('')
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  async function handlePasswordChange() {
    if (!newPassword || newPassword !== confirm) { setError('Passwords do not match'); return }
    setSaving(true); setError(null); setMessage(null)
    try {
      await updatePassword(newPassword)
      setMessage('Password updated successfully')
      setNewPassword(''); setConfirm('')
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ margin: 0, color: 'var(--text)' }}>Account</h1>
      {message && <p style={{ color: 'green', margin: 0 }}>{message}</p>}
      {error && <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>}

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>Profile</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Current email: <strong style={{ color: 'var(--text)' }}>{settings?.email}</strong></p>
        <button onClick={() => navigate('/profile/edit')} style={{ padding: '0.6rem 1.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', alignSelf: 'flex-start' }}>Edit Profile</button>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>Change Email</h3>
        <input placeholder="New email address" value={newEmail} onChange={e => setNewEmail(e.target.value)}
          style={{ padding: '0.5rem', border: '1px solid var(--input-border)', borderRadius: '4px', background: 'var(--input-bg)', color: 'var(--text)' }} />
        <button onClick={handleEmailChange} disabled={saving}
          style={{ padding: '0.6rem 1.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', alignSelf: 'flex-start' }}>
          {saving ? 'Sending...' : 'Send verification'}
        </button>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>Change Password</h3>
        <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
          style={{ padding: '0.5rem', border: '1px solid var(--input-border)', borderRadius: '4px', background: 'var(--input-bg)', color: 'var(--text)' }} />
        <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)}
          style={{ padding: '0.5rem', border: '1px solid var(--input-border)', borderRadius: '4px', background: 'var(--input-bg)', color: 'var(--text)' }} />
        <button onClick={handlePasswordChange} disabled={saving}
          style={{ padding: '0.6rem 1.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', alignSelf: 'flex-start' }}>
          {saving ? 'Saving...' : 'Change Password'}
        </button>
      </section>
    </div>
  )
}

function PreferencesTab({ settings, onUpdate }) {
  const { setTheme, setLanguage } = useAppContext()
  const [form, setForm] = useState({
    theme: settings?.theme || 'system',
    language: settings?.language || 'en',
    emailNotifs: settings?.email_notifs ?? true
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleSave() {
    setSaving(true)
    try {
      await updatePreferences({ ...form, profileVisibility: settings?.profile_visibility, allowFriendRequests: settings?.allow_friend_requests, allowMessages: settings?.allow_messages })
      setTheme(form.theme)
      setLanguage(form.language)
      onUpdate(prev => ({ ...prev, theme: form.theme, language: form.language, email_notifs: form.emailNotifs }))
      setMessage('Preferences saved')
    } catch (e) { setMessage('Error: ' + e.message) } finally { setSaving(false) }
  }

  const selectStyle = { padding: '0.5rem', border: '1px solid var(--input-border)', borderRadius: '4px', background: 'var(--input-bg)', color: 'var(--text)', width: '100%' }

  return (
    <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, color: 'var(--text)' }}>Preferences</h1>
      {message && <p style={{ color: 'green', margin: 0 }}>{message}</p>}

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>Theme</h3>
        <select value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))} style={selectStyle}>
          <option value="system">System default</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>Language</h3>
        <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} style={selectStyle}>
          <option value="en">English</option>
          <option value="el">Ελληνικά</option>
        </select>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>Notifications</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', color: 'var(--text)' }}>
          <input type="checkbox" checked={form.emailNotifs} onChange={e => setForm(f => ({ ...f, emailNotifs: e.target.checked }))} />
          Receive email notifications
        </label>
      </section>

      <button onClick={handleSave} disabled={saving}
        style={{ padding: '0.6rem 1.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', alignSelf: 'flex-start' }}>
        {saving ? 'Saving...' : 'Save preferences'}
      </button>
    </div>
  )
}

function PrivacyTab({ settings, onUpdate }) {
  const [form, setForm] = useState({
    profileVisibility: settings?.profile_visibility || 'public',
    allowFriendRequests: settings?.allow_friend_requests || 'everyone',
    allowMessages: settings?.allow_messages || 'everyone'
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleSave() {
    setSaving(true)
    try {
      await updatePreferences({ theme: settings?.theme, language: settings?.language, emailNotifs: settings?.email_notifs, ...form })
      onUpdate(prev => ({ ...prev, profile_visibility: form.profileVisibility, allow_friend_requests: form.allowFriendRequests, allow_messages: form.allowMessages }))
      setMessage('Privacy settings saved')
    } catch (e) { setMessage('Error: ' + e.message) } finally { setSaving(false) }
  }

  const selectStyle = { padding: '0.5rem', border: '1px solid var(--input-border)', borderRadius: '4px', background: 'var(--input-bg)', color: 'var(--text)', width: '100%' }

  return (
    <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, color: 'var(--text)' }}>Privacy</h1>
      {message && <p style={{ color: 'green', margin: 0 }}>{message}</p>}

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>Profile visibility</h3>
        <select value={form.profileVisibility} onChange={e => setForm(f => ({ ...f, profileVisibility: e.target.value }))} style={selectStyle}>
          <option value="public">Public — anyone can view</option>
          <option value="friends">Friends only</option>
          <option value="private">Private — only me</option>
        </select>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>Friend requests</h3>
        <select value={form.allowFriendRequests} onChange={e => setForm(f => ({ ...f, allowFriendRequests: e.target.value }))} style={selectStyle}>
          <option value="everyone">Everyone can send requests</option>
          <option value="nobody">Nobody</option>
        </select>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>Messages</h3>
        <select value={form.allowMessages} onChange={e => setForm(f => ({ ...f, allowMessages: e.target.value }))} style={selectStyle}>
          <option value="everyone">Everyone can message me</option>
          <option value="friends">Friends only</option>
          <option value="nobody">Nobody</option>
        </select>
      </section>

      <button onClick={handleSave} disabled={saving}
        style={{ padding: '0.6rem 1.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', alignSelf: 'flex-start' }}>
        {saving ? 'Saving...' : 'Save privacy settings'}
      </button>
    </div>
  )
}

function AppearanceTab() {
  const { theme } = useAppContext()
  const [accentColor, setAccentColor] = useState(
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#246e9d'
  )
  const [borderRadius, setBorderRadius] = useState(
    getComputedStyle(document.documentElement).getPropertyValue('--radius').trim() || '6px'
  )
  const [fontSize, setFontSize] = useState(
    getComputedStyle(document.documentElement).getPropertyValue('--font-size-md').trim() || '0.9rem'
  )

  function applyToken(token, value) {
    document.documentElement.style.setProperty(token, value)
  }

  function handleAccent(val) {
    setAccentColor(val)
    applyToken('--accent', val)
  }

  function handleRadius(val) {
    setBorderRadius(val)
    applyToken('--radius', val)
    applyToken('--radius-lg', `${parseInt(val) + 4}px`)
  }

  function handleFontSize(val) {
    setFontSize(val)
    applyToken('--font-size-md', val)
    applyToken('--font-size-sm', `${parseFloat(val) - 0.1}rem`)
    applyToken('--font-size-lg', `${parseFloat(val) + 0.1}rem`)
    document.documentElement.style.fontSize = val === '0.9rem' ? '16px' : val === '1rem' ? '17px' : '15px'
  }

  const labelStyle = { fontSize: '0.85rem', fontWeight: '500', color: 'var(--text)', marginBottom: '0.4rem', display: 'block' }
  const rowStyle = { display: 'flex', flexDirection: 'column', gap: '0.4rem' }

  return (
    <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ margin: 0, color: 'var(--text)' }}>Appearance</h1>
      <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
        Changes apply instantly. Database persistence coming soon.
      </p>

      <section style={rowStyle}>
        <label style={labelStyle}>Accent Color</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input type="color" value={accentColor} onChange={e => handleAccent(e.target.value)}
            style={{ width: '48px', height: '36px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', padding: '2px' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{accentColor}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {['#246e9d', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2', '#111111'].map(c => (
            <div key={c} onClick={() => handleAccent(c)}
              style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', border: accentColor === c ? '3px solid var(--text)' : '3px solid transparent', boxShadow: accentColor === c ? `0 0 0 3px ${c}40` : 'none', transition: 'transform 0.1s, box-shadow 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
          ))}
        </div>
      </section>

      <section style={rowStyle}>
        <label style={labelStyle}>Border Radius</label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {[{ label: 'Sharp', value: '2px' }, { label: 'Default', value: '6px' }, { label: 'Rounded', value: '12px' }, { label: 'Pill', value: '999px' }].map(opt => {
            const isSelected = borderRadius === opt.value
            return (
              <div key={opt.value} onClick={() => handleRadius(opt.value)}
                style={{ padding: '0.4rem 0.85rem', border: `1px solid ${isSelected ? accentColor : 'var(--border)'}`, borderRadius: opt.value === '999px' ? '999px' : '6px', cursor: 'pointer', fontSize: '0.82rem', color: isSelected ? accentColor : 'var(--text)', fontWeight: isSelected ? '600' : '400', background: isSelected ? `${accentColor}18` : 'transparent', transition: 'all 0.15s' }}>
                {opt.label}
              </div>
            )
          })}
        </div>
      </section>

      <section style={rowStyle}>
        <label style={labelStyle}>Font Size</label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {[{ label: 'Small', value: '0.8rem' }, { label: 'Default', value: '0.9rem' }, { label: 'Large', value: '1rem' }].map(opt => {
            const isSelected = fontSize === opt.value
            return (
              <div key={opt.value} onClick={() => handleFontSize(opt.value)}
                style={{ padding: '0.4rem 0.85rem', border: `1px solid ${isSelected ? accentColor : 'var(--border)'}`, borderRadius: '6px', cursor: 'pointer', fontSize: opt.value, color: isSelected ? accentColor : 'var(--text)', fontWeight: isSelected ? '600' : '400', background: isSelected ? `${accentColor}18` : 'transparent', transition: 'all 0.15s' }}>
                {opt.label}
              </div>
            )
          })}
        </div>
      </section>

      <section style={rowStyle}>
        <label style={labelStyle}>Preview</label>
        <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.4rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: 'var(--font-size-md)', cursor: 'pointer' }}>Primary</button>
            <button style={{ padding: '0.4rem 1rem', background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 'var(--font-size-md)', cursor: 'pointer' }}>Secondary</button>
            <button style={{ padding: '0.4rem 1rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: 'var(--font-size-md)', cursor: 'pointer' }}>Danger</button>
          </div>
          <input placeholder="Input preview..." style={{ padding: '0.4rem 0.75rem', border: '1px solid var(--input-border)', borderRadius: 'var(--radius)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 'var(--font-size-md)', outline: 'none', width: '100%' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'var(--accent-subtle)', color: 'var(--accent)', fontSize: 'var(--font-size-sm)' }}>Badge</span>
            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Default</span>
          </div>
        </div>
      </section>
    </div>
  )
}

function DangerTab() {
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleDelete() {
    if (confirm !== 'DELETE') { setError('Type DELETE to confirm'); return }
    setLoading(true)
    try {
      await deleteAccount()
      await signOut()
      navigate('/')
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: '480px' }}>
      <h1 style={{ marginBottom: '1.5rem', color: 'var(--danger)' }}>Danger Zone</h1>
      <div style={{ border: '1px solid var(--danger)', borderRadius: '8px', padding: '1.5rem', background: 'rgba(229,62,62,0.05)' }}>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--danger)' }}>Delete Account</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>This action is permanent and cannot be undone.</p>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <input placeholder='Type DELETE to confirm' value={confirm} onChange={e => setConfirm(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--danger)', borderRadius: '4px', marginBottom: '1rem', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text)' }} />
        <button onClick={handleDelete} disabled={loading}
          style={{ padding: '0.6rem 1.5rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          {loading ? 'Deleting...' : 'Delete My Account'}
        </button>
      </div>
    </div>
  )
}
