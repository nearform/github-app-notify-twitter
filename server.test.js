'use strict'

import { test } from 'tap'
import buildServer, {
  ERR_MISSING_TWITTER_KEYS,
  ERR_MISSING_INPUTS,
  MSG_REPO_IS_PRIVATE,
  MSG_REPO_IS_NOT_PUBLISHED
} from './server.js'

const testServer = buildServer({
  LOG_LEVEL: 'silent',
  PRETTY_PRINT: false,
  TWITTER_APP_KEY: 'app_key',
  TWITTER_APP_SECRET: 'app_secret',
  TWITTER_ACCESS_TOKEN: 'access_token',
  TWITTER_ACCESS_TOKEN_SECRET: 'access_token_secret'
})

test('healthcheck route', async t => {
  const response = await testServer.inject('/healthcheck')

  t.same(response.statusCode, 200)
})

test('release route, no Twitter keys', async t => {
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

  t.same(response.statusCode, 500)
  t.same(response.body, ERR_MISSING_TWITTER_KEYS)
})

test('release route, missing action, repository and release inputs', async t => {
  const response = await testServer.inject({
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    url: '/release',
    body: JSON.stringify({})
  })

  t.same(response.statusCode, 500)
  t.same(response.body, ERR_MISSING_INPUTS)
})

test('release route, private repository', async t => {
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

  t.same(response.statusCode, 200)
  t.same(response.body, MSG_REPO_IS_PRIVATE)
})

test('release route, action is not "publish"', async t => {
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

  t.same(response.statusCode, 200)
  t.same(response.body, MSG_REPO_IS_NOT_PUBLISHED)
})

// test('release route, successful tweet', async t => {
//   t.mock('./server.js', {
//     'twitter-api-v2': {
//       TwitterApi: () => ({
//         readWrite: {
//           v2: {
//             tweet: () => 'tweet'
//           }
//         }
//       })
//     }
//   })
//   const response = await testServer.inject({
//     method: 'POST',
//     headers: {
//       'content-type': 'application/json'
//     },
//     url: '/release',
//     body: JSON.stringify({
//       action: 'edited',
//       repository: {
//         name: 'test_repo',
//         private: false
//       },
//       release: {
//         tag_name: '1.0.0',
//         html_url: 'http://example.com'
//       }
//     })
//   })

//   t.same(response.statusCode, 200)
//   t.same(response.body, 'ok')
// })
