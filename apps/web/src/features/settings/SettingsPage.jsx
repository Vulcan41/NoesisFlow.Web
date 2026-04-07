import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePassword, deleteAccount } from './settingsService.js'
import { signOut } from '@features/auth/authService.js'

const TABS = ['Profile', 'Security', 'Danger Zone']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Profile')

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <aside style={{ width: '200px', borderRight: '1px solid #eee', padding: '1.5rem 1rem', flexShrink: 0 }}>
        <h2 style={{ fontSize: '0.85rem', color: '#aaa', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>Settings</h2>
        {TABS.map(tab => (
          <div key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '0.6rem 0.75rem', borderRadius: '6px', cursor: 'pointer', marginBottom: '0.25rem', background: activeTab === tab ? '#f0f0f0' : 'transparent', fontWeight: activeTab === tab ? '500' : 'normal', color: tab === 'Danger Zone' ? '#e53e3e' : 'inherit' }}>
            {tab}
          </div>
        ))}
      </aside>
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {activeTab === 'Profile' && <ProfileTab />}
        {activeTab === 'Security' && <SecurityTab />}
        {activeTab === 'Danger Zone' && <DangerTab />}
      </main>
    </div>
  )
}

function ProfileTab() {
  const navigate = useNavigate()
  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Profile Settings</h1>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>Manage your public profile information.</p>
      <button onClick={() => navigate('/profile/edit')} style={{ padding: '0.6rem 1.5rem', background: '#111', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
        Edit Profile
      </button>
    </div>
  )
}

function SecurityTab() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  async function handleChangePassword() {
    if (!newPassword || newPassword !== confirm) { setError('Passwords do not match'); return }
    setSaving(true)
    setError(null)
    try {
      await updatePassword(newPassword)
      setMessage('Password updated successfully')
      setNewPassword('')
      setConfirm('')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px' }}>
      <h1 style={{ marginBottom: '1rem' }}>Security</h1>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
        <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
        <button onClick={handleChangePassword} disabled={saving} style={{ padding: '0.6rem', background: '#246e9d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {saving ? 'Saving...' : 'Change Password'}
        </button>
      </div>
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
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px' }}>
      <h1 style={{ marginBottom: '1rem', color: '#e53e3e' }}>Danger Zone</h1>
      <div style={{ border: '1px solid #fecaca', borderRadius: '8px', padding: '1.5rem', background: '#fff5f5' }}>
        <h3 style={{ margin: '0 0 0.5rem', color: '#e53e3e' }}>Delete Account</h3>
        <p style={{ color: '#888', marginBottom: '1rem', fontSize: '0.9rem' }}>This action is permanent and cannot be undone.</p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <input placeholder='Type DELETE to confirm' value={confirm} onChange={e => setConfirm(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #fca5a5', borderRadius: '4px', marginBottom: '1rem', boxSizing: 'border-box' }} />
        <button onClick={handleDelete} disabled={loading} style={{ padding: '0.6rem 1.5rem', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          {loading ? 'Deleting...' : 'Delete My Account'}
        </button>
      </div>
    </div>
  )
}
