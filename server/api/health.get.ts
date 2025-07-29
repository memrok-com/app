export default defineEventHandler(async (_event) => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  }
})
