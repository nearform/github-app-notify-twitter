import Fastify from 'fastify'
import { TwitterApi } from 'twitter-api-v2'

export const ERR_MISSING_TWITTER_KEYS = 'Missing required Twitter access keys!'
export const ERR_MISSING_INPUTS =
  'Missing required inputs: action, release or repository!'
export const ERR_TWITTER =
  'Sending message failed due to an error from Twitter: '
export const MSG_REPO_IS_PRIVATE =
  'Repository is private, no message is sent to Twitter.'
export const MSG_REPO_IS_NOT_PUBLISHED =
  'Repository is not published so no message is sent to Twitter.'
export const MSG_MESSAGE_LOG = 'Sending message: '
export default function buildServer(config) {
  const REPOSITORY_PUBLISHED = 'published'

  const fastify = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      prettyPrint: config.PRETTY_PRINT
    }
  })

  fastify.get('/healthcheck', async () => 'ok')

  fastify.post('/release', async (request, reply) => {
    try {
      const appKey = config.TWITTER_APP_KEY
      const appSecret = config.TWITTER_APP_SECRET
      const accessToken = config.TWITTER_ACCESS_TOKEN
      const accessSecret = config.TWITTER_ACCESS_TOKEN_SECRET
      const { action, release, repository } = request.body

      if (!appKey || !appSecret || !accessToken || !accessSecret) {
        fastify.log.error(ERR_MISSING_TWITTER_KEYS)
        return reply.code(500).send(ERR_MISSING_TWITTER_KEYS)
      }

      if (!action || !release || !repository) {
        fastify.log.error(ERR_MISSING_INPUTS)
        return reply.code(500).send(ERR_MISSING_INPUTS)
      }

      if (repository.private) {
        fastify.log.info(MSG_REPO_IS_PRIVATE)
        return reply.code(200).send(MSG_REPO_IS_PRIVATE)
      }

      if (action !== REPOSITORY_PUBLISHED) {
        fastify.log.info(MSG_REPO_IS_NOT_PUBLISHED)
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

      fastify.log.info(`${MSG_MESSAGE_LOG} ${message}`)

      try {
        await rwClient.v2.tweet(message)
        return reply.code(200).send('ok')
      } catch (err) {
        fastify.log.error(ERR_TWITTER, err.data?.detail)
        return reply.code(err.code).send(`${ERR_TWITTER} ${err.data?.detail}`)
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send(`Error: ${error}`)
    }
  })

  return fastify
}
