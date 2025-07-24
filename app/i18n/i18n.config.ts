import { observations } from "~~/server/database/schema"

export default defineI18nConfig(() => ({
  legacy: false,
  messages: {
    en: {
      navigation: {
        memories: "Memories",
        assistants: "Assistants",
        settings: "Settings",
        github: "GitHub",
        darkMode: "Dark Mode",
        lightMode: "Light Mode",
        profile: "Profile",
        logout: "Logout",
      },
      index: {
        hero: {
          title: "Rock-Solid Memory to Personalize All Your AI Assistants",
          description:
            "Keep your data on your infrastructure under your control.",
        },
      },
      common: {
        success: "Success",
        error: "Error",
        create: "Create",
        cancel: "Cancel",
        save: "Save",
        delete: "Delete",
        edit: "Edit",
      },
      memories: {
        description: "What assistants know about you and your life.",
        navigation: {
          entities: {
            title: "Entities",
            description: "Things that matter to you.",
            create: "Add Entity",
            list: "List Entities",
          },
          relations: {
            title: "Relations",
            description: "Ways in which entities are connected.",
            create: "Add Relation",
            list: "List Relations",
          },
          observations: {
            title: "Observations",
            description: "Descriptions of entities.",
            create: "Add Observation",
            list: "List Observations",
          },
          erase: "Erase Memories",
        },
        entities: {
          create: {
            title: "Create Entity",
            description: "Add a new entity that assistants should know about",
            fields: {
              name: "Name",
              type: "Type",
              typePlaceholder: "Select entity type...",
              typeHelp:
                "Select from existing types or type a new one to create it",
              typeSearch: "Search or create type...",
              metadata: "Metadata (JSON)",
              metadataPlaceholder: "Enter JSON metadata here...",
            },
            success: "Entity created successfully",
            error: "Failed to create entity",
          },
        },
        relations: {
          create: {
            title: "Create Relation",
            description: "Connect entities with a relationship",
            fields: {
              subject: "Subject Entity",
              subjectPlaceholder: "Select subject entity...",
              predicate: "Relationship Type",
              predicatePlaceholder: "Select or create relationship type...",
              predicateHelp:
                "What type of relationship exists? (e.g., works for, knows, is managed by)",
              object: "Object Entity",
              objectPlaceholder: "Select object entity...",
              strength: "Strength",
              strengthHelp:
                "How strong is this relationship? (0 = weak, 1 = very strong)",
              metadata: "Metadata (JSON)",
              metadataPlaceholder: "Enter JSON metadata here...",
              searchEntity: "Search entities...",
              searchPredicate: "Search or create relationship type...",
            },
            success: "Relation created successfully",
            error: "Failed to create relation",
          },
        },
        observations: {
          create: {
            title: "Create Observation",
            description: "Record what assistants should know about an entity",
            fields: {
              entity: "Entity",
              entityPlaceholder: "Select entity...",
              content: "Observation",
              metadata: "Metadata (JSON)",
              metadataPlaceholder: "Enter JSON metadata here...",
              searchEntity: "Search entities...",
            },
            success: "Observation created successfully",
            error: "Failed to create observation",
          },
        },
      },
    },
  },
}))
