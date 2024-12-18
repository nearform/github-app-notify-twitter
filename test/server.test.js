process.loadEnvFile('.env.test')

import { createHmac } from 'crypto'
import { describe, test, mock } from 'node:test'
import buildServer from '../src/server.js'
import {
  ERR_TWITTER,
  ERR_MISSING_INPUTS,
  MSG_REPO_IS_PRIVATE,
  MSG_REPO_IS_NOT_PUBLISHED
} from '../src/constants.js'

const testServer = buildServer(
  {
    LOG_LEVEL: 'silent'
  },
  {
    readWrite: {
      v2: {
        tweet: mock.fn()
      }
    }
  }
)

const generateHeaderHash = (
  reqBody,
  secret = process.env.NOTIFY_TWITTER_WEBHOOK_SECRET
) => {
  const hash = createHmac('sha256', secret)
  hash.update(reqBody)

  return `sha256=${hash.digest('hex')}`
}

describe('GH app', () => {
  test('release route, verifyRequest hook fails due to different secret', async t => {
    const body = JSON.stringify({})

    const response = await testServer.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': generateHeaderHash(body, 'another secret')
      },
      url: '/release',
      body
    })

    t.assert.strictEqual(response.statusCode, 401)
  })

  test('release route, missing action, repository and release inputs', async t => {
    const body = JSON.stringify({})

    const response = await testServer.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': generateHeaderHash(body)
      },
      url: '/release',
      body
    })

    t.assert.strictEqual(response.statusCode, 500)
    t.assert.strictEqual(response.body, ERR_MISSING_INPUTS)
  })

  test('release route, private repository', async t => {
    const body = JSON.stringify({
      action: 'published',
      repository: {
        name: 'test_repo',
        private: true
      },
      release: {
        tag_name: '1.0.0',
        html_url: 'http://example.com'
      }
    })
    const response = await testServer.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': generateHeaderHash(body)
      },
      url: '/release',
      body
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(response.body, MSG_REPO_IS_PRIVATE)
  })

  test('release route, action is not "published"', async t => {
    const body = JSON.stringify({
      action: 'edited',
      repository: {
        name: 'test_repo',
        private: false
      },
      release: {
        tag_name: '1.0.0',
        html_url: 'http://example.com'
      }
    })

    const response = await testServer.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': generateHeaderHash(body)
      },
      url: '/release',
      body
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(response.body, MSG_REPO_IS_NOT_PUBLISHED)
  })

  test('release route, successful tweet', async t => {
    const server = buildServer(
      {
        LOG_LEVEL: 'silent'
      },
      {
        readWrite: {
          v2: {
            tweet: async message => message || null
          }
        }
      }
    )

    const body = JSON.stringify({
      action: 'published',
      repository: {
        name: 'test_repo',
        private: false
      },
      release: {
        tag_name: '1.0.0',
        html_url: 'http://example.com'
      }
    })

    const response = await server.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': generateHeaderHash(body)
      },
      url: '/release',
      body
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(response.body, 'ok')
  })

  test('release route, Twitter API failure', async t => {
    const errMessage = 'No permissions to send tweets'

    const server = buildServer(
      {
        LOG_LEVEL: 'silent'
      },
      {
        readWrite: {
          v2: {
            tweet: async () => {
              throw {
                code: 403,
                data: {
                  detail: errMessage
                }
              }
            }
          }
        }
      }
    )

    const body = JSON.stringify({
      action: 'published',
      repository: {
        name: 'test_repo',
        private: false
      },
      release: {
        tag_name: '1.0.0',
        html_url: 'http://example.com'
      }
    })

    const response = await server.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': generateHeaderHash(body)
      },
      url: '/release',
      body
    })

    t.assert.strictEqual(response.statusCode, 403)
    t.assert.strictEqual(response.body, `${ERR_TWITTER}: ${errMessage}`)
  })
})
