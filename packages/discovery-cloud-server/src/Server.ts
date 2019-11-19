import http from 'http'
import express from 'express'
import WebSocket, { AddressInfo } from 'ws'
import expressWs from 'express-ws'
import Debug from 'debug'
import uuid from 'uuid'
import MapSet from './MapSet'
import pump from 'pump'
import { ConnectId, Channel, ClientToServer, ServerToClient } from './Msg'
import { Duplex } from 'stream'

const log = Debug('discovery-cloud:Server')

export interface Options {
  port: number
}

export default class Server {
  port: number
  pending: Map<ConnectId, Duplex>
  channels: MapSet<WebSocket, Channel>
  app: expressWs.Application
  server?: http.Server

  constructor({ port }: Options) {
    this.port = port
    this.pending = new Map()
    this.channels = new MapSet()
    this.app = expressWs(express()).app
  }

  close(): Promise<void> {
    return new Promise((res) => {
      if (!this.server) return res()
      this.server.close(() => res())
    })
  }

  listen(): Promise<AddressInfo> {
    this.app.ws('/discovery', this.onDiscovery)
    this.app.ws('/connect/:id', this.onConnect)

    return new Promise((res) => {
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        const address = this.server?.address() as AddressInfo
        log('Listening:', address)
        res(address)
      })
    })
  }

  private onDiscovery = (ws: WebSocket) => {
    log('/discovery')

    ws.on('message', (data: string) => {
      this.onMsg(ws, JSON.parse(data))
    }).on('close', () => {
      this.channels.delete(ws)
    })
  }

  private onConnect = (ws: WebSocket, req: express.Request) => {
    ws.binaryType = 'nodebuffer'

    const id = req.params.id as ConnectId
    const duplex = (WebSocket as any).createWebSocketStream(ws) as Duplex
    const pending = this.pending.get(id)

    if (pending) {
      this.pending.delete(id)
      pump(duplex, pending, duplex)
      log('Connect: %s', id)
    } else {
      this.pending.set(id, duplex)
      log('Pending connect: %s', id)
    }
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
