import { EventEmitter } from 'events'

type MessengerEventType = 'conversation.created' | 'conversation.updated' | 'message.created' | 'read.updated' | 'ping'

export interface MessengerEventPayload {
  type: MessengerEventType
  conversationId?: string
  messageId?: string
  actorUserId?: string
  data?: any
}

type Subscriber = (event: MessengerEventPayload) => void

interface MessengerBus {
  emitter: EventEmitter
  subscribe: (userId: string, cb: Subscriber) => () => void
  emitToUsers: (userIds: string[], payload: MessengerEventPayload) => void
}

const globalAny = globalThis as any

if (!globalAny.__MESSENGER_BUS__) {
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
    emitter.on(channel, handler as any)
    emitter.on('broadcast', generalHandler as any)
    return () => {
      emitter.off(channel, handler as any)
      emitter.off('broadcast', generalHandler as any)
    }
  }

  const emitToUsers = (userIds: string[], payload: MessengerEventPayload) => {
    for (const uid of userIds) {
      emitter.emit(`user:${uid}`, { ...payload, userId: uid })
    }
    emitter.emit('broadcast', { ...payload, targets: userIds })
  }

  globalAny.__MESSENGER_BUS__ = { emitter, subscribe, emitToUsers } as MessengerBus
}

export const messengerBus: MessengerBus = globalAny.__MESSENGER_BUS__



