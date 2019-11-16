import test from 'tape'
import Client from '../packages/discovery-cloud/src/Client'
import Server from '../packages/discovery-cloud-server/src/Server'

test('discovery-cloud', (t) => {
  const port = 5432
  const server = new Server({ port })
  server.listen()

  const clientA = new Client({ url: `ws://localhost:${port}` })
  const clientB = new Client({ url: `ws://localhost:${port}` })

  t.test('connects', (t) => {})
})
