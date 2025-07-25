import { createAuthenticatedHandler } from '../../utils/auth-middleware'

export default createAuthenticatedHandler(async (event, userDb, user) => {
  // Get all user's assistants (RLS ensures only user's data is accessible)
  const assistants = await userDb.getAssistants()

  // Calculate total count
  const total = assistants.length

  // Calculate assistants by type
  const typeStats = assistants.reduce((acc, assistant) => {
    const type = assistant.type
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const byType = Object.entries(typeStats)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  // Get recent assistant activity (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentActivity = assistants.filter(assistant => 
    assistant.createdAt >= sevenDaysAgo
  ).length

  return {
    total,
    recentActivity,
    byType
  }
})