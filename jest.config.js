/**
 * Lightweight Jest config for pure logic/unit tests.
 * Uses babel-jest (with the project's babel.config.js, including the "@/" alias)
 * in a Node environment. Component/integration tests that need the full native
 * runtime should be run against a device/dev build.
 */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Scope coverage to the pure logic that these unit tests exercise. UI, DB,
  // and native-module wrappers (alarms/photos/sound) are validated via builds
  // and on-device testing rather than unit coverage.
  collectCoverageFrom: ['lib/bedtime.ts', 'lib/time.ts', 'lib/stars.ts', 'lib/lastAction.ts'],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 75,
      functions: 85,
      lines: 90,
    },
  },
};
