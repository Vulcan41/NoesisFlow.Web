import { supabase } from '@core/supabase.js'

export async function getMySettings() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, bio, avatar_url, language, theme, email_notifs, profile_visibility, allow_friend_requests, allow_messages')
    .eq('id', user.id)
    .single()
  if (error) throw error
  return { ...data, email: user.email }
}

export async function updatePreferences({ language, theme, emailNotifs, profileVisibility, allowFriendRequests, allowMessages }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('profiles').update({
    language,
    theme,
    email_notifs: emailNotifs,
    profile_visibility: profileVisibility,
    allow_friend_requests: allowFriendRequests,
    allow_messages: allowMessages
  }).eq('id', user.id)
  if (error) throw error
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function updateEmail(newEmail) {
  const { error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) throw error
}

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw error
}
