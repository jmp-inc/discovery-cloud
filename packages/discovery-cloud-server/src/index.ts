import Server from './Server'

const { PORT } = process.env
const port = PORT ? parseInt(PORT, 10) : 80

new Server({ port }).listen()
