import buildServer from './server.js'
import config from './config.js'

const server = buildServer(config)

const start = async () => {
  try {
    await server.listen(3000)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
