/**
 * Global Jest setup — runs after the test framework is installed.
 * Clears persisted state before each test to prevent cross-test contamination.
 */

// Mock URL methods not available in jsdom
Object.defineProperty(global, "URL", {
    writable: true,
    value: {
        ...global.URL,
        createObjectURL: jest.fn(() => "blob:mock-url"),
        revokeObjectURL: jest.fn(),
    },
});

beforeEach(() => {
    // Clear Zustand persist storage between tests
    localStorage.clear();
    sessionStorage.clear();
});
