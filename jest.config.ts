import type { Config } from "jest";

// Force UTC so Date.getHours() / getMinutes() are deterministic across machines
process.env.TZ = "UTC";

const config: Config = {
    testEnvironment: "jest-environment-jsdom",
    preset: "ts-jest",
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        // Redirect ESM-only nanoid to a CJS-compatible manual mock
        "^nanoid$": "<rootDir>/__mocks__/nanoid.ts",
    },
    transform: {
        "^.+\\.(ts|tsx)$": [
            "ts-jest",
            {
                tsconfig: "<rootDir>/tsconfig.test.json",
            },
        ],
    },
    testMatch: ["<rootDir>/src/__tests__/**/*.test.ts", "<rootDir>/src/__tests__/**/*.test.tsx"],
    setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
    clearMocks: true,
    testEnvironmentOptions: {
        // Run with UTC so Date.getHours() is deterministic
        timezone: "UTC",
    },
    coverageDirectory: "coverage",
    collectCoverageFrom: [
        "src/store/**/*.ts",
        "src/lib/**/*.ts",
        "!src/lib/utils.ts",
        "!src/lib/notifications.ts",
    ],
};

export default config;
