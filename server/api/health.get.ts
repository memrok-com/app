import { db } from '../utils/db'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const config = useRuntimeConfig()
  
  // Basic health status
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: config.public.MEMROK_VERSION || "development",
    buildYear: config.public.MEMROK_BUILD_YEAR || new Date().getFullYear().toString(),
    uptime: process.uptime(),
    checks: {
      database: "unknown",
      memory: "ok",
    }
  }

  try {
    // Test database connectivity (without requiring authentication)
    await db.execute('SELECT 1 as health_check')
    health.checks.database = "ok"
  } catch (error) {
    console.error('Database health check failed:', error)
    health.checks.database = "error"
    health.status = "degraded"
  }

  // Memory usage check
  const memUsage = process.memoryUsage()
  const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024)
  health.checks.memory = memUsageMB > 512 ? "warning" : "ok"
  
  // Response time
  const responseTime = Date.now() - startTime
  
  // Set HTTP status based on overall health
  if (health.status === "degraded") {
    setResponseStatus(event, 503)
  }

  return {
    ...health,
    responseTime: `${responseTime}ms`,
    memoryUsage: `${memUsageMB}MB`
  }
})
