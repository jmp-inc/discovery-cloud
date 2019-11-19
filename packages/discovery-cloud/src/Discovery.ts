import WebSocket from 'ws'
import Debug from 'debug'
import { Channel, ConnectId, ClientToServer, ServerToClient } from './Msg'

const log = Debug('discovery-cloud:Client:Discovery')

export interface Handlers {
  onConnect(details: { id: ConnectId; isClient: boolean }): void
}

export default class Discovery {
  socket?: WebSocket
  url: string
  channels: Set<Channel>
  handlers: Handlers
  reconnectTimer?: NodeJS.Timeout
  isClosed: boolean

  constructor(root: string, handlers: Handlers) {
    this.channels = new Set()
    this.isClosed = false
    this.url = `${root}/discovery`
    this.handlers = handlers
    this.connect()
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  join(channel: Channel): void {
    this.channels.add(channel)

    if (this.isConnected) {
      this.send({
        join: [channel],
      })
    }
  }

  leave(channel: Channel): void {
    this.channels.delete(channel)

    if (this.isConnected) {
      this.send({
        leave: [channel],
      })
    }
  }

  close() {
    this.isClosed = true
    this.socket?.close()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
  }

  private connect() {
    if (this.isClosed) return

    log('connecting...')
    this.socket = new WebSocket(this.url)

    this.startHeartbeat(this.socket)

    this.socket
      .on('open', () => {
        log('connected')
        this.sendHello()
      })
      .on('close', () => {
        if (this.isClosed) return

        log('onclose... reconnecting in 5s')
        this.reconnectTimer = setTimeout(() => {
          delete this.reconnectTimer
          this.connect()
        }, 5000)
      })
      .on('message', (data) => {
        log('ondata', data)
        this.receive(JSON.parse(data.toString()))
      })
      .on('error', (err) => {
        console.error('onerror', err)
      })
  }

  private startHeartbeat(socket: WebSocket): void {
    const interval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) socket.ping()
    }, 5000)

    socket.once('close', () => {
      clearInterval(interval)
    })
  }

  private sendHello() {
    this.send({
      join: [...this.channels],
    })
  }

  private send(msg: ClientToServer): void {
    log('send %o', msg)
    this.socket?.send(JSON.stringify(msg))
  }

  private receive(msg: ServerToClient): void {
    this.handlers.onConnect({ id: msg.connect, isClient: msg.isClient })
  }
}
