import { eq } from "drizzle-orm"
import { db, schema } from "../../utils/db"

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // Validate that userId is provided
    if (!body.userId) {
      throw createError({
        statusCode: 400,
        statusMessage: "userId is required",
      })
    }

    const userId = body.userId

    // Delete all memories for this user
    // Thanks to cascade constraints, deleting entities will also delete related observations and relations
    const deletedEntities = await db
      .delete(schema.entities)
      .where(eq(schema.entities.createdByUser, userId))
      .returning({ id: schema.entities.id })

    // Also delete any standalone relations/observations not tied to entities (if any exist)
    const deletedRelations = await db
      .delete(schema.relations)
      .where(eq(schema.relations.createdByUser, userId))
      .returning({ id: schema.relations.id })

    const deletedObservations = await db
      .delete(schema.observations)
      .where(eq(schema.observations.createdByUser, userId))
      .returning({ id: schema.observations.id })

    return {
      success: true,
      deletedCounts: {
        entities: deletedEntities.length,
        relations: deletedRelations.length,
        observations: deletedObservations.length,
      },
      message: "All memories have been successfully erased",
    }
  } catch (error) {
    console.error("Failed to erase memories:", error)
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to erase memories",
      data: error,
    })
  }
})
