'use strict'

import { TwitterApi } from 'twitter-api-v2'
import buildServer, {
  ERR_TWITTER,
  ERR_MISSING_TWITTER_KEYS,
  ERR_MISSING_INPUTS,
  MSG_REPO_IS_PRIVATE,
  MSG_REPO_IS_NOT_PUBLISHED
} from './server.js'

const testServer = buildServer({
  LOG_LEVEL: 'silent',
  PRETTY_PRINT: false,
  TWITTER_API_KEY: process.env.TWITTER_API_KEY,
  TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
  TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
  TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET
})

jest.mock('twitter-api-v2')

describe('GH app', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('healthcheck route', async () => {
    const response = await testServer.inject('/healthcheck')

    expect(response.statusCode).toBe(200)
  })

  it('release route, no Twitter keys', async () => {
    const testServerNoTwtKeys = buildServer({
      LOG_LEVEL: 'silent',
      PRETTY_PRINT: false
    })
    const response = await testServerNoTwtKeys.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/release',
      body: JSON.stringify({})
    })

    expect(response.statusCode).toBe(500)
    expect(response.body).toBe(ERR_MISSING_TWITTER_KEYS)
  })

  it('release route, missing action, repository and release inputs', async () => {
    const response = await testServer.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/release',
      body: JSON.stringify({})
    })

    expect(response.statusCode).toBe(500)
    expect(response.body).toBe(ERR_MISSING_INPUTS)
  })

  it('release route, private repository', async () => {
    const response = await testServer.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/release',
      body: JSON.stringify({
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
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toBe(MSG_REPO_IS_PRIVATE)
  })

  it('release route, action is not "published"', async () => {
    const response = await testServer.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/release',
      body: JSON.stringify({
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
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toBe(MSG_REPO_IS_NOT_PUBLISHED)
  })

  it('release route, successful tweet', async () => {
    TwitterApi.mockImplementation(() => {
      return {
        readWrite: {
          v2: {
            tweet: async message => message || null
          }
        }
      }
    })
    const response = await testServer.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/release',
      body: JSON.stringify({
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
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('ok')
  })

  it('release route, Twitter API failure', async () => {
    const errMessage = 'No permissions to send tweets'
    TwitterApi.mockImplementation(() => {
      return {
        readWrite: {
          v2: {
            tweet: async () => {
              // Throw a Twitter exception
              throw {
                code: 403,
                data: { detail: errMessage }
              }
            }
          }
        }
      }
    })
    const response = await testServer.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/release',
      body: JSON.stringify({
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
    })

    expect(response.statusCode).toBe(403)
    expect(response.body).toBe(`${ERR_TWITTER} ${errMessage}`)
  })

  it('release route, server failure', async () => {
    TwitterApi.mockImplementation(() => {
      return null
    })
    const response = await testServer.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/release',
      body: JSON.stringify({
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
    })

    expect(response.statusCode).toBe(500)
    expect(response.body).toContain('Error:')
  })
})
