require(`dotenv`).config();

module.exports = {
  testEnvironment: "node",
  testTimeout: 0,
  // restoreMocks: true,
  // clearMocks: true,
  // resetMocks: true,
  roots: ["<rootDir>"],
  moduleFileExtensions: ["js", "ts", "json"],
  testPathIgnorePatterns: ["./node_modules/"],
  moduleNameMapper: {},
  testPathIgnorePatterns: [
    `<rootDir>/.next/`,
    `<rootDir>/node_modules/`,
    `<rootDir>/.cache`,
    `<rootDir>/build`,
    `<rootDir>/.tmp`,
  ],
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest",
  },
};
