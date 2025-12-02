module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/seeds/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/src/config/',
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
  ],
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
};
