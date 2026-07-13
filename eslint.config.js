// Flat ESLint config (ESLint 9+/10) built on Expo's shared config.
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'ios/**',
      'android/**',
      '.expo/**',
      'dist/**',
      'coverage/**',
      'db/migrations/**',
      'assets/**',
      'expo-env.d.ts',
    ],
  },
  ...expoConfig,
  eslintConfigPrettier,
  {
    rules: {
      'import/order': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Build/CI helper scripts run in Node and legitimately log to stdout.
    files: ['scripts/**'],
    rules: {
      'no-console': 'off',
    },
  },
];
