import Fastify from 'fastify'
import { TwitterApi } from 'twitter-api-v2'
import 'dotenv/config'

export default function buildServer() {
  const REPOSITORY_PUBLISHED = 'published'
  const ERR_MISSING_TWITTER_KEYS = 'Missing required Twitter access keys!'
  const ERR_MISSING_INPUTS =
    'Missing required inputs: action, release or repository!'
  const ERR_TWITTER = 'Sending message failed due to an error from Twitter: '
  const MSG_REPO_IS_PRIVATE =
    'Repository is private, no message is sent to Twitter.'
  const MSG_REPO_IS_NOT_PUBLISHED =
    'Repository is not published so no message is sent to Twitter.'
  const MSG_MESSAGE_LOG = 'Sending message: '
  const fastify = Fastify()

  fastify.get('/healthcheck', async () => 'ok')

  fastify.post('/release', async (request, reply) => {
    try {
      const appKey = process.env.TWITTER_APP_KEY
      const appSecret = process.env.TWITTER_APP_SECRET
      const accessToken = process.env.TWITTER_ACCESS_TOKEN
      const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET
      const { action, release, repository } = request.body

      if (!appKey || !appSecret || !accessToken || !accessSecret) {
        console.error(ERR_MISSING_TWITTER_KEYS)
        return reply.code(500).send(ERR_MISSING_TWITTER_KEYS)
      }

      if (!action || !release || !repository) {
        console.error(ERR_MISSING_INPUTS)
        return reply.code(500).send(ERR_MISSING_INPUTS)
      }

      if (repository.private) {
        console.log(MSG_REPO_IS_PRIVATE)
        return reply.code(200).send(MSG_REPO_IS_PRIVATE)
      }

      if (action !== REPOSITORY_PUBLISHED) {
        console.log(MSG_REPO_IS_NOT_PUBLISHED)
        return reply.code(200).send(MSG_REPO_IS_NOT_PUBLISHED)
      }

      const client = new TwitterApi({
        appKey,
        appSecret,
        accessToken,
        accessSecret
      })

      const message = `${repository.name} ${release.tag_name} has been released. Check out the release notes: ${release.html_url}`
      const rwClient = client.readWrite

      console.log(`${MSG_MESSAGE_LOG} ${message}`)

      try {
        await rwClient.v2.tweet(message)
        return reply.code(200).send('ok')
      } catch (err) {
        console.error(ERR_TWITTER, err.data?.detail)
        return reply.code(err.code).send(`${ERR_TWITTER} ${err.data?.detail}`)
      }
    } catch (error) {
      console.error(': ', error)
      fastify.log.error(error)
      return reply.code(500).send(`Error: ${error}`)
    }
  })

  return fastify
}
