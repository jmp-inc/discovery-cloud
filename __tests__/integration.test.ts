import test from 'tape'
import Client from '../packages/discovery-cloud/src/Client'
import Server from '../packages/discovery-cloud-server/src/Server'

test('discovery-cloud', async (t) => {
  const server = new Server({ port: 0 })
  const { port } = await server.listen()

  const clientA = new Client({ host: 'localhost', port })
  const clientB = new Client({ host: 'localhost', port })

  t.test('opening connection and sending data', (t) => {
    t.plan(4)

    clientA.on('connection', (socket, _details) => {
      socket
        .on('data', (data) => {
          t.deepEqual(data, Buffer.from('data_from_clientB'), 'clientA gets data from clientB')
        })
        .on('close', () => {
          t.pass('clientA closes')
          t.assert(socket.destroyed, 'socket is destroyed')
        })

      socket.write(Buffer.from('data_from_clientA'))
    })

    clientB.on('connection', (socket, _details) => {
      socket.on('data', (data) => {
        t.deepEqual(data, Buffer.from('data_from_clientA'), 'clientB gets data from clientA')
        socket.destroy()
      })

      socket.write(Buffer.from('data_from_clientB'))
    })

    clientA.join(Buffer.from('foo'))
    clientB.join(Buffer.from('foo'))
  })

  test.onFinish(() => {
    console.log('tests finished')
    server.close()
    clientA.close()
    clientB.close()
  })
})
