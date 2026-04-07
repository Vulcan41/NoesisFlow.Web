import { supabase } from '@core/supabase.js'

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, bio, avatar_url, credits, created_at')
    .eq('id', user.id)
    .single()
  if (error) throw error
  return data
}

export async function getProfileById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, bio, avatar_url, credits, created_at')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateMyProfile({ username, fullName, bio, avatarFile }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  let avatarUrl = null
  if (avatarFile) {
    const ext = avatarFile.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
    avatarUrl = pub.publicUrl
  }
  const updates = { username, full_name: fullName, bio: bio || null }
  if (avatarUrl) updates.avatar_url = avatarUrl
  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
  if (error) throw error
}

export async function sendFriendRequest(targetUserId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, receiver_id: targetUserId, status: 'pending' })
  if (error) throw error
}

export async function getFriendshipStatus(targetUserId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('friendships')
    .select('id, status, requester_id')
    .or(`and(requester_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},receiver_id.eq.${user.id})`)
    .maybeSingle()
  return data
}
