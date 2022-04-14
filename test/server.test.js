'use strict'

import { TwitterApi } from 'twitter-api-v2'
import buildServer from '../src/server.js'
import {
  ERR_TWITTER,
  ERR_MISSING_INPUTS,
  MSG_REPO_IS_PRIVATE,
  MSG_REPO_IS_NOT_PUBLISHED
} from '../src/constants.js'

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

    const server = buildServer({
      LOG_LEVEL: 'silent',
      TWITTER_API_KEY: process.env.TWITTER_API_KEY,
      TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
      TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
      TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET
    })

    const response = await server.inject({
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
    const server = buildServer({
      LOG_LEVEL: 'silent',
      TWITTER_API_KEY: process.env.TWITTER_API_KEY,
      TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
      TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
      TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET
    })

    const response = await server.inject({
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
})
