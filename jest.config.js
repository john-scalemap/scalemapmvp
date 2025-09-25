export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.(test|spec).ts'],
  testTimeout: 120000,
  collectCoverageFrom: [
    'tests/**/*.ts',
    '!tests/**/*.d.ts',
    '!**/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        types: ['jest', 'node']
      }
    }]
  }
};