import { supabase } from '@core/supabase.js'

export async function getMySettings() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, bio, avatar_url')
    .eq('id', user.id)
    .single()
  if (error) throw error
  return data
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw error
}
