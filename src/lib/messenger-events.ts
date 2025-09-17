import { EventEmitter } from 'events'

type MessengerEventType =
  | 'conversation.created'
  | 'conversation.updated'
  | 'message.created'
  | 'read.updated'
  | 'ping'

export interface MessengerEventPayload {
  type: MessengerEventType
  conversationId?: string
  messageId?: string
  actorUserId?: string
  data?: unknown
}

type Subscriber = (event: MessengerEventPayload) => void

interface MessengerBus {
  emitter: EventEmitter
  subscribe: (userId: string, cb: Subscriber) => () => void
  emitToUsers: (userIds: string[], payload: MessengerEventPayload) => void
}

const globalScope = globalThis as { __MESSENGER_BUS__?: MessengerBus }

if (!globalScope.__MESSENGER_BUS__) {
  const emitter = new EventEmitter()
  emitter.setMaxListeners(1000)

  type InternalUserPayload = MessengerEventPayload & { userId: string }
  type BroadcastPayload = MessengerEventPayload & { targets: string[] }

  const subscribe = (userId: string, cb: Subscriber) => {
    const channel = `user:${userId}`
    const userListener = (payload: InternalUserPayload) => {
      if (payload.userId === userId) {
        const { userId: _userId, ...rest } = payload
        void _userId
        cb(rest)
      }
    }
    const broadcastListener = (payload: BroadcastPayload) => {
      if (payload.targets.includes(userId)) {
        const { targets: _targets, ...rest } = payload
        void _targets
        cb(rest)
      }
    }
    emitter.on(channel, userListener)
    emitter.on('broadcast', broadcastListener)
    return () => {
      emitter.off(channel, userListener)
      emitter.off('broadcast', broadcastListener)
    }
  }

  const emitToUsers = (userIds: string[], payload: MessengerEventPayload) => {
    for (const uid of userIds) {
      const userPayload: InternalUserPayload = { ...payload, userId: uid }
      emitter.emit(`user:${uid}`, userPayload)
    }
    const broadcastPayload: BroadcastPayload = { ...payload, targets: userIds }
    emitter.emit('broadcast', broadcastPayload)
  }

  globalScope.__MESSENGER_BUS__ = { emitter, subscribe, emitToUsers }
}

export const messengerBus: MessengerBus = globalScope.__MESSENGER_BUS__!
