import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyProfile } from './profileService.js'
import Avatar from '@shared/components/ui/Avatar.jsx'

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>Error: {error}</div>

  return (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
        <Avatar url={profile.avatar_url} name={profile.full_name} size={80} />
        <div>
          <h1 style={{ margin: 0 }}>{profile.full_name}</h1>
          <div style={{ color: '#888', marginTop: '0.25rem' }}>@{profile.username}</div>
          {profile.bio && <div style={{ marginTop: '0.5rem', color: '#555' }}>{profile.bio}</div>}
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#888' }}>{profile.credits ?? 0} ♦ credits</div>
        </div>
      </div>
      <button onClick={() => navigate('/profile/edit')} style={{ padding: '0.6rem 1.5rem', background: 'var(--btn-dark)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Edit Profile</button>
    </div>
  )
}
