import { Socket } from 'net'

export { Socket }
export type SocketType = 'tcp' | 'utp' | 'relay'

export interface Swarm {
  join(dk: Buffer, options?: JoinOptions): void
  leave(dk: Buffer): void
  on<K extends keyof SwarmEvents>(name: K, cb: SwarmEvents[K]): this
  off<K extends keyof SwarmEvents>(name: K, cb: SwarmEvents[K]): this
  destroy(cb: () => void): void
}

export interface SwarmEvents {
  connection(socket: Socket, details: ConnectionDetails): void
  peer(peer: PeerInfo): void
}

export interface JoinOptions {
  announce?: boolean
  lookup?: boolean
}

export interface ConnectionDetails {
  client: boolean
  peer: null | PeerInfo
  type: SocketType
  reconnect?(shouldReconnect: boolean): void
  ban?(): void
}

export interface PeerInfo {
  port: number
  host: string // IP of peer
  local: boolean // Is the peer on the LAN?
}
