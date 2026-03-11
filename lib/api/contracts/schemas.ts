export const activityFeedResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["events", "nextCursor"],
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
        required: ["id", "type", "actor", "timestamp", "message"],
        properties: {
          id: { type: "string", minLength: 1 },
          type: { type: "string", minLength: 1 },
          appointmentId: { type: "string" },
          patientName: { type: "string" },
          actor: { type: "string", minLength: 1 },
          timestamp: { type: "string", format: "date-time" },
          message: { type: "string", minLength: 1 },
          metadata: { type: "object" },
          link: { type: "string" },
        },
      },
    },
    nextCursor: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
  },
} as const;

export const notificationsResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["notifications", "unreadCount", "nextCursor"],
  properties: {
    notifications: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "title", "createdAt"],
        properties: {
          id: { type: "string", minLength: 1 },
          title: { type: "string", minLength: 1 },
          body: { anyOf: [{ type: "string" }, { type: "null" }] },
          createdAt: { type: "string", format: "date-time" },
          readAt: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
          entityType: { anyOf: [{ type: "string" }, { type: "null" }] },
          entityId: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
      },
    },
    unreadCount: { type: "integer", minimum: 0 },
    nextCursor: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
  },
} as const;

export const notificationsReadAllResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["updatedCount"],
  properties: {
    updatedCount: { type: "integer", minimum: 0 },
  },
} as const;

export const appointmentEventsResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["events"],
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "action", "createdAt"],
        properties: {
          id: { type: "string", minLength: 1 },
          appointmentId: { type: "string" },
          action: { type: "string", minLength: 1 },
          actorRole: { anyOf: [{ type: "string" }, { type: "null" }] },
          actorUserId: { anyOf: [{ type: "string" }, { type: "null" }] },
          actorUser: { anyOf: [{ type: "object" }, { type: "null" }] },
          metadata: { anyOf: [{ type: "object" }, { type: "null" }] },
          previousStatus: { anyOf: [{ type: "string" }, { type: "null" }] },
          newStatus: { anyOf: [{ type: "string" }, { type: "null" }] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
} as const;

export const apiErrorSchema = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: { error: { type: "string", minLength: 1 } },
} as const;
