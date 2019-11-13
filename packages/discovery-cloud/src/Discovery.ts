import WebSocket from './WebSocket'
import Debug from 'debug'
import { EventEmitter } from 'events'

const log = Debug('discovery-cloud:Discovery')

export default class Discovery extends EventEmitter {
  url: string
  socket: WebSocket

  constructor(root: string) {
    super()

    this.url = `${root}/discovery`
    this.socket = this.connect()
  }

  private connect() {
    const socket = new WebSocket(this.url)

    socket.addEventListener('open', () => {
      this.sendHello()
    })

    socket.addEventListener('close', () => {
      log('discovery.onclose... reconnecting in 5s')
      setTimeout(() => {
        this.connect()
      }, 5000)
    })

    socket.addEventListener('message', (event) => {
      const data = Buffer.from(event.data)
      log('discovery.ondata', data)
      this.receive(JSON.parse(data.toString()))
    })

    socket.addEventListener('error', (event: any) => {
      console.error('discovery.onerror', event.error)
    })

    return socket
  }

  private sendHello() {
    this.send({
      type: 'Hello',
      join: [...this.channels],
    })
  }

  private send(msg: Msg.ClientToServer) {
    log('discovery.send %o', msg)
    this.discovery.send(JSON.stringify(msg))
  }

  private receive(msg: Msg.ServerToClient) {
    log('discovery.receive %o', msg)

    switch (msg.type) {
      case 'Connect':
        this.onConnect(msg.peerId, msg.peerChannels)
        break
    }
  }
}
