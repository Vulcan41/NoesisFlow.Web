import { supabase } from '@core/supabase.js'

export async function getMyFriends() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('friends')
    .select(`
      id, status, created_at,
      requester:profiles!friends_requester_id_fkey (id, username, full_name, avatar_url),
      receiver:profiles!friends_receiver_id_fkey (id, username, full_name, avatar_url)
    `)
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
  if (error) throw error
  return { userId: user.id, friends: data }
}

export async function acceptFriend(friendId) {
  const { error } = await supabase
    .from('friends')
    .update({ status: 'accepted' })
    .eq('id', friendId)
  if (error) throw error
}

export async function rejectFriend(friendId) {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', friendId)
  if (error) throw error
}

export async function removeFriend(friendId) {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', friendId)
  if (error) throw error
}
