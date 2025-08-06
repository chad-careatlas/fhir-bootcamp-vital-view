import '@testing-library/jest-dom'

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}))

// Mock fhirclient
jest.mock('fhirclient', () => ({
  oauth2: {
    ready: jest.fn(),
    authorize: jest.fn(),
  },
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  HeartPulse: () => 'HeartPulse',
  PlusCircle: () => 'PlusCircle',
  Gauge: () => 'Gauge',
}))

// Global test setup
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Suppress console.log during tests unless needed
const originalConsole = global.console
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(), // Also suppress error logs during tests
}