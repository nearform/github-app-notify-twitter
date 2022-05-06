import buildServer from './src/server.js'
import config from './config.js'

const server = buildServer(config)

const start = async () => {
  try {
    const port = process.env.PORT || 8080
    await server.listen(port, '0.0.0.0')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
