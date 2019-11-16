import express from 'express'
import WebSocket from 'ws'
import expressWs from 'express-ws'
import Debug from 'debug'
import uuid from 'uuid'
import MapSet from './MapSet'
import pump from 'pump'
import { ConnectId, Channel, ClientToServer, ServerToClient } from '../../discovery-cloud/src/Msg'

const log = Debug('discovery-cloud:server')
const expressApp = express()
const { app } = expressWs(expressApp)

export interface Options {
  port: number
}

export default class Server {
  port: number
  pending: Map<ConnectId, NodeJS.ReadWriteStream>
  channels: MapSet<WebSocket, Channel>

  constructor({ port }: Options) {
    this.port = port
    this.pending = new Map()
    this.channels = new MapSet()
  }

  private send(peer: WebSocket, msg: ServerToClient): void {
    peer.send(JSON.stringify(msg))
  }

  private onMsg = (client: WebSocket, msg: ClientToServer): void => {
    const { join, leave } = msg

    if (leave) this.channels.removeAll(client, leave)

    if (join) {
      const shared = this.clientsWith(join)
      shared.delete(client)
      for (const other of shared) {
        this.sendConnect(client, other)
      }

      this.channels.merge(client, join)
    }
  }

  listen() {
    app.ws('/discovery', (ws, _req) => {
      log('/discovery')

      ws.on('message', (data: string) => {
        this.onMsg(ws, JSON.parse(data))
      }).on('close', () => {
        this.channels.delete(ws)
      })
    })

    app.ws('/connect/:id', (ws, req) => {
      const id = req.param('id') as ConnectId
      const duplex = (WebSocket as any).createWebSocketStream(ws) as NodeJS.ReadWriteStream
      const pending = this.pending.get(id)

      if (pending) {
        this.pending.delete(id)
        pump(duplex, pending, duplex)
        log('Connect: %s', id)
      } else {
        this.pending.set(id, duplex)
        log('Pending connect: %s', id)
      }
    })

    app.listen(this.port, '0.0.0.0', (_err) => {
      console.log('Listening on port', this.port)
    })
  }

  private sendConnect(a: WebSocket, b: WebSocket) {
    const id = connectId()
    this.send(a, { connect: id, isClient: true })
    this.send(b, { connect: id, isClient: false })
  }

  private clientsWith(channels: Channel[]): Set<WebSocket> {
    const common = new Set<WebSocket>()
    for (const ch of channels) {
      for (const client of this.channels.keysWith(ch)) {
        common.add(client)
      }
    }
    return common
  }
}

export function connectId(): ConnectId {
  return uuid() as ConnectId
}
