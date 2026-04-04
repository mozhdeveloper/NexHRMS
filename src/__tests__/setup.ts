/**
 * Jest test setup file
 * - Mocks Supabase clients to prevent hitting real DB in unit tests
 * - Resets mocks between tests
 */

// Mock Supabase server clients
jest.mock("@/services/supabase-server", () => ({
  createServerSupabaseClient: jest.fn(),
  createAdminSupabaseClient: jest.fn(),
}));

// Mock Supabase browser client
jest.mock("@/services/supabase-browser", () => ({
  createBrowserSupabaseClient: jest.fn(),
  createClient: jest.fn(),
}));

// Mock nanoid for deterministic IDs in tests
jest.mock("nanoid", () => ({
  nanoid: () => "test-id-mock",
}));

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.resetAllMocks();
});
