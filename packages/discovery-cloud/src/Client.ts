import { EventEmitter } from 'events'
import * as Base58 from 'bs58'
import Debug from 'debug'
import { Swarm, ConnectionDetails, PeerInfo } from './SwarmInterface'
import WebSocket from 'ws'
import { ServerToClient, ClientToServer, Channel, ConnectId } from './Msg'

Debug.formatters.b = Base58.encode

const log = Debug('discovery-cloud:Client')

export interface Options {
  url: string
}

export default class DiscoveryCloudClient extends EventEmitter implements Swarm {
  url: string
  channels: Set<Channel> = new Set()
  discovery: WebSocket

  constructor(opts: Options) {
    super()

    this.url = opts.url
    this.discovery = this.connectDiscovery()

    log('Initialized %o', opts)
  }

  join(channelBuffer: Buffer) {
    const channel = encodeChannel(channelBuffer)
    this.channels.add(channel)

    if (this.discovery.readyState === WebSocket.OPEN) {
      this.send({
        join: [channel],
      })
    }
  }

  leave(channelBuffer: Buffer) {
    const channel = encodeChannel(channelBuffer)
    this.channels.delete(channel)

    if (this.discovery.readyState === WebSocket.OPEN) {
      this.send({
        leave: [channel],
      })
    }
  }

  listen(_port: unknown) {
    // NOOP
  }

  destroy(cb: () => void) {
    this.discovery.close()
    cb()
  }

  private connectDiscovery() {
    const discovery = new WebSocket(`${this.url}/discovery`)

    discovery.addEventListener('open', () => {
      this.sendHello()
    })

    discovery.addEventListener('close', () => {
      log('discovery.onclose... reconnecting in 5s')
      setTimeout(() => {
        this.discovery = this.connectDiscovery()
      }, 5000)
    })

    discovery.addEventListener('message', (event) => {
      const data = Buffer.from(event.data)
      log('discovery.ondata', data)
      this.receive(JSON.parse(data.toString()))
    })

    discovery.addEventListener('error', (event: any) => {
      console.error('discovery.onerror', event.error)
    })

    return discovery
  }

  private sendHello() {
    this.send({
      join: [...this.channels],
    })
  }

  private send(msg: ClientToServer) {
    log('discovery.send %o', msg)
    this.discovery.send(JSON.stringify(msg))
  }

  private receive({ connect, isClient }: ServerToClient) {
    const peer: PeerInfo = {
      host: 'discovery-cloud',
      port: 0,
      local: false,
    }

    this.emit('peer', peer)

    const socket = new WebSocket(`${this.url}/connect/${connect}`)
    socket.binaryType = 'arraybuffer'

    const conn = (WebSocket as any).createWebSocketStream(socket)
    socket.on('open', () => {
      const details: ConnectionDetails = {
        client: isClient,
        type: 'relay',
        peer,
      }
      this.emit('connection', conn, details)
    })
  }
}

function encodeChannel(buffer: Buffer): Channel {
  return Base58.encode(buffer) as Channel
}
