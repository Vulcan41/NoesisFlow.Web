import { supabase } from '@core/supabase.js'

export async function getMyProjects() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('project_members')
    .select(`
      role,
      projects (
        id, name, description, visibility, avatar_url
      )
    `)
    .eq('user_id', user.id)
  if (error) throw error
  return data.map(row => ({ ...row.projects, role: row.role }))
}
