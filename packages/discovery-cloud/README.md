# Discovery Cloud Client

A simple discovery cloud client library that can be paired with the [discovery-cloud-server](https://github.com/jmp-inc/discovery-cloud) to be used as a cloud based alternative to [hyperswarm](https://github.com/hyperswarm/hyperswarm)

### Example

```ts
import { Repo } from 'hypermerge'

import Client from 'discovery-cloud'

const repo = new Repo({ memory: true })

const swarm = new Client({
  url: 'wss://fish-monger-9999.herokuapp.com',
})

repo.setSwarm(swarm)
```

### License

MIT
