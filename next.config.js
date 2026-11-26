const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

module.exports = (phase) => ({
  reactStrictMode: true,
  // Keep production builds from overwriting a running development server's chunks.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
})
