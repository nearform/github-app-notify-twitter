import { join } from 'desm'
import envSchema from 'env-schema'
import S from 'fluent-json-schema'

const schema = S.object()
  .prop('NODE_ENV', S.string().default('development'))
  .prop('LOG_LEVEL', S.string().default('info'))
  .prop('PRETTY_PRINT', S.boolean().default(false))
  .prop('TWITTER_APP_KEY', S.string().required())
  .prop('TWITTER_APP_SECRET', S.string().required())
  .prop('TWITTER_ACCESS_TOKEN', S.string().required())
  .prop('TWITTER_ACCESS_TOKEN_SECRET', S.string().required())

const config = envSchema({
  schema,
  dotenv: { path: join(import.meta.url, '.env') }
})

export default config
