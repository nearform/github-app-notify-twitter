export default {
  setupFiles: ['./.jest/env.js'],
  clearMocks: true,
  collectCoverage: true,
  transform: {
    '^.+\\.js$': 'babel-jest'
  }
}
