import { EventEmitter } from 'events'
import * as Base58 from 'bs58'
import Debug from 'debug'
import WebSocket from './WebSocket'
import Peer from './ClientPeer'
import Discovery from './Discovery'

Debug.formatters.b = Base58.encode

const log = Debug('discovery-cloud:Client')

export interface Options {
  url: string
}

export default class DiscoveryCloudClient extends EventEmitter {
  url: string
  channels: Set<string> = new Set()
  peers: Map<string, Peer> = new Map()
  discovery: Discovery

  constructor(opts: Options) {
    super()

    this.url = opts.url
    this.discovery = new Discovery(this.url)

    log('Initialized %o', opts)
  }

  join(channelBuffer: Buffer) {
    log('join %b', channelBuffer)

    const channel = Base58.encode(channelBuffer)
    this.channels.add(channel)

    if (this.discovery.readyState === WebSocket.OPEN) {
      this.send({
        type: 'Join',
        id: this.id,
        join: [channel],
      })
    }
  }

  leave(channelBuffer: Buffer) {
    log('leave %b', channelBuffer)

    const channel = Base58.encode(channelBuffer)
    this.channels.delete(channel)
    this.peers.forEach((peer) => {
      if (peer.has(channel)) peer.close(channel)
    })

    if (this.discovery.readyState === WebSocket.OPEN) {
      this.send({
        type: 'Leave',
        id: this.id,
        leave: [channel],
      })
    }
  }

  listen(_port: unknown) {
    // NOOP
  }

  private onConnect(id: string, channels: string[]) {
    const peer = this.peer(id)

    const newChannels = channels.filter((ch) => !peer.connections.has(ch))

    newChannels.forEach((channel) => {
      peer.add(channel)
    })
  }

  private peer(id: string): Peer {
    const existing = this.peers.get(id)
    if (existing) return existing

    log('creating peer %s', id)

    const url = `${this.url}/connect/${this.id}`
    const peer = new Peer({ url, id, stream: this.connect })
    this.peers.set(id, peer)

    return peer
  }
}
