import Fastify from 'fastify'
import {
  ERR_MISSING_INPUTS,
  ERR_TWITTER,
  MSG_REPO_IS_PRIVATE,
  MSG_REPO_IS_NOT_PUBLISHED,
  MSG_MESSAGE_LOG,
  RELEASE_PUBLISHED
} from './constants.js'
import verifyRequest from './verifyRequest.js'

export default function buildServer(config, twitterClient) {
  const rwClient = twitterClient.readWrite

  const fastify = Fastify({
    logger: {
      level: config.LOG_LEVEL
    }
  })

  fastify.post(
    '/release',
    { preHandler: verifyRequest },
    async (request, reply) => {
      const { action, release, repository } = request.body

      if (!action || !release || !repository) {
        fastify.log.error(ERR_MISSING_INPUTS)
        return reply.code(500).send(ERR_MISSING_INPUTS)
      }

      if (repository.private) {
        fastify.log.info(MSG_REPO_IS_PRIVATE)
        return reply.code(200).send(MSG_REPO_IS_PRIVATE)
      }

      if (action !== RELEASE_PUBLISHED) {
        fastify.log.info(MSG_REPO_IS_NOT_PUBLISHED)
        return reply.code(200).send(MSG_REPO_IS_NOT_PUBLISHED)
      }

      const message = `${repository.name} ${release.tag_name} has been released. Check out the release notes: ${release.html_url}`

      fastify.log.info(`${MSG_MESSAGE_LOG} ${message}`)

      try {
        await rwClient.v2.tweet(message)
        return reply.code(200).send('ok')
      } catch (err) {
        fastify.log.error(err, ERR_TWITTER)
        return reply.code(err.code).send(`${ERR_TWITTER}: ${err.data?.detail}`)
      }
    }
  )

  return fastify
}
