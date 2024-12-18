import { TwitterApi } from 'twitter-api-v2'

import buildServer from './src/server.js'
import config from './config.js'

const client = new TwitterApi({
  appKey: config.TWITTER_API_KEY,
  appSecret: config.TWITTER_API_SECRET,
  accessToken: config.TWITTER_ACCESS_TOKEN,
  accessSecret: config.TWITTER_ACCESS_TOKEN_SECRET
})

const server = buildServer(config, client)

const port = process.env.PORT || 8080
await server.listen({ port, host: '0.0.0.0' })
