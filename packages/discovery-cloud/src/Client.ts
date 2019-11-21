import { EventEmitter } from 'events'
import * as Url from 'url'
import * as Base58 from 'bs58'
import { Swarm, ConnectionDetails, PeerInfo, SwarmEvents } from './SwarmInterface'
import WebSocket from 'ws'
import { Channel, ConnectId } from './Msg'
import Discovery, { Handlers } from './Discovery'
import { Duplex } from 'stream'

export interface Options {
  url: string
}

export default class DiscoveryCloudClient extends EventEmitter implements Swarm {
  discovery: Discovery
  root: string
  isClosed: boolean
  banned: Set<ConnectId>
  connections: Map<ConnectId, Duplex>

  constructor({ url }: Options) {
    super()

    this.root = url
    this.isClosed = false
    this.banned = new Set()
    this.connections = new Map()

    if (!this.host || !this.port) {
      throw new Error(`Invalid url: '${url}'. Must be a websocket URL`)
    }

    this.discovery = new Discovery(this.root, {
      onConnect: this.onConnect,
    })
  }

  get host(): string {
    return Url.parse(this.root).host!
  }

  get port(): number {
    const { protocol, port } = Url.parse(this.root)
    if (port) return parseInt(port!, 10)
    if (protocol === 'ws:') return 80
    if (protocol === 'wss:') return 443
    return 0
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
    this.isClosed = true
    this.discovery.close()

    for (const conn of this.connections.values()) {
      conn.destroy()
    }

    cb?.()
  }

  on<K extends keyof SwarmEvents>(name: K, cb: SwarmEvents[K]): this {
    return super.on(name, cb)
  }

  private onConnect: Handlers['onConnect'] = ({ id, isClient }) => {
    if (this.isClosed) return
    if (this.connections.has(id)) return

    const peer: PeerInfo = {
      host: this.host,
      port: this.port,
      local: false,
    }

    const details: ConnectionDetails = {
      client: isClient,
      type: 'relay',
      peer,
      ban: () => {
        this.banned.add(id)
      },
    }

    this.emit('peer', peer)

    const socket = new WebSocket(`${this.root}/connect/${id}`)

    const conn = (WebSocket as any).createWebSocketStream(socket, {
      allowHalfOpen: false,
    }) as Duplex

    this.connections.set(id, conn)

    conn
      .on('end', () => {
        // NOTE(jeff): This is probably a hack, but otherwise the conn
        // does not emit 'close'
        conn.destroy()
      })
      .on('close', () => {
        this.connections.delete(id)
        if (this.isClosed) return
        if (this.banned.has(id)) return

        setTimeout(() => {
          this.onConnect({ id, isClient })
        }, 5000)
      })

    socket.on('open', () => {
      this.emit('connection', conn, details)
    })
  }
}

function encodeChannel(buffer: Buffer): Channel {
  return Base58.encode(buffer) as Channel
}
