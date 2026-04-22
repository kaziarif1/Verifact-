import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/**/*.d.ts',
    '!src/config/swagger.ts',
  ],
  coverageThreshold: {
    global: { branches: 70, functions: 75, lines: 80, statements: 80 },
  },
  setupFilesAfterFramework: [],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
  globals: {
    'ts-jest': {
      tsconfig: { strict: false },
    },
  },
};

export default config;
