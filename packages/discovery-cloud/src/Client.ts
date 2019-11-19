import { EventEmitter } from 'events'
import * as Base58 from 'bs58'
import { Swarm, ConnectionDetails, PeerInfo, SwarmEvents } from './SwarmInterface'
import WebSocket from 'ws'
import { Channel } from './Msg'
import Discovery, { Handlers } from './Discovery'

export interface Options {
  host: string
  port: number
}

export default class DiscoveryCloudClient extends EventEmitter implements Swarm {
  discovery: Discovery
  host: string
  port: number

  constructor({ host, port }: Options) {
    super()

    this.host = host
    this.port = port
    this.discovery = new Discovery(this.root, {
      onConnect: this.onConnect,
    })
  }

  get root(): string {
    return `ws://${this.host}:${this.port}`
  }

  join(channelBuffer: Buffer) {
    this.discovery.join(encodeChannel(channelBuffer))
  }

  leave(channelBuffer: Buffer) {
    this.discovery.leave(encodeChannel(channelBuffer))
  }

  listen(_port: unknown) {
    // NOOP
  }

  close(): void {
    this.destroy()
  }

  destroy(cb?: () => void) {
    this.discovery.close()
    cb?.()
  }

  on<K extends keyof SwarmEvents>(name: K, cb: SwarmEvents[K]): this {
    return super.on(name, cb)
  }

  private onConnect: Handlers['onConnect'] = ({ id, isClient }) => {
    const peer: PeerInfo = {
      host: this.host,
      port: this.port,
      local: false,
    }

    const details: ConnectionDetails = {
      client: isClient,
      type: 'relay',
      peer,
    }

    this.emit('peer', peer)

    const socket = new WebSocket(`${this.root}/connect/${id}`)

    const conn = (WebSocket as any).createWebSocketStream(socket, {
      allowHalfOpen: false,
    })
    conn.on('end', () => {
      // NOTE(jeff): This is probably a hack, but otherwise the conn
      // does not emit 'close'
      conn.destroy()
    })
    socket.on('open', () => {
      this.emit('connection', conn, details)
    })
  }
}

function encodeChannel(buffer: Buffer): Channel {
  return Base58.encode(buffer) as Channel
}
