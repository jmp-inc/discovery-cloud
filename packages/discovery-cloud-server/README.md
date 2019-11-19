# Discovery Cloud

This was made as a (mostly) drop-in replacement for hyperswarm.

https://github.com/hyperswarm/hyperswarm

We were developing on a platform (Chrome App) that had some serious network
bugs and platform limitations, and built this as a replacement. This is the server
portion of the project that will allow peers to find each other via discovery
keys and get piped websockets to each other.

This app is intended to be deployable to heroku out of the box and require no
configuration. By its design it should only ever run with a single dyno as
there's no backplane for processes to communicate with each other.

### Setup

The code should work as a heroku app out of the box with no extra setup.

```
  $ heroku create
  Creating app... done, ⬢ fish-monger-9999
  https://fish-monger-9999.herokuapp.com/ | https://git.heroku.com/fish-monger-9999.git
  $ git push heroku master
```

### LICENSE

MIT
