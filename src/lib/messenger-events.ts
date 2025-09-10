import { EventEmitter } from 'events'

type MessengerEventType = 'conversation.created' | 'conversation.updated' | 'message.created' | 'read.updated' | 'ping'

export interface MessengerEventPayload {
  type: MessengerEventType
  conversationId?: string
  messageId?: string
  actorUserId?: string
  data?: Record<string, unknown>
}

type Subscriber = (event: MessengerEventPayload) => void

interface MessengerBus {
  emitter: EventEmitter
  subscribe: (userId: string, cb: Subscriber) => () => void
  emitToUsers: (userIds: string[], payload: MessengerEventPayload) => void
}

const globalRef = globalThis as unknown as { __MESSENGER_BUS__?: MessengerBus }

if (!globalRef.__MESSENGER_BUS__) {
  const emitter = new EventEmitter()
  emitter.setMaxListeners(1000)

  const subscribe = (userId: string, cb: Subscriber) => {
    const channel = `user:${userId}`
    const handler = (payload: MessengerEventPayload & { userId: string }) => {
      if (payload && payload.userId === userId) cb(payload)
    }
    const generalHandler = (payload: MessengerEventPayload & { userId?: string; targets?: string[] }) => {
      if (Array.isArray(payload?.targets) && payload.targets.includes(userId)) cb(payload)
    }
    emitter.on(channel, handler)
    emitter.on('broadcast', generalHandler)
    return () => {
      emitter.off(channel, handler)
      emitter.off('broadcast', generalHandler)
    }
  }

  const emitToUsers = (userIds: string[], payload: MessengerEventPayload) => {
    for (const uid of userIds) {
      emitter.emit(`user:${uid}`, { ...payload, userId: uid })
    }
    emitter.emit('broadcast', { ...payload, targets: userIds })
  }

  globalRef.__MESSENGER_BUS__ = { emitter, subscribe, emitToUsers }
}

export const messengerBus: MessengerBus = globalRef.__MESSENGER_BUS__ as MessengerBus


