export type ConnectId = string & { __connectId: true }
export type Channel = string & { __channel: true }

export interface ClientToServer {
  join?: Channel[]
  leave?: Channel[]
}

export interface ServerToClient {
  connect: ConnectId
  isClient: boolean
}
