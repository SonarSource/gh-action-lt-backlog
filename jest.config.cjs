module.exports = {
    // Bypass the exports map (which only has "import" conditions) and point directly to the entry files,
    // so Jest's CJS resolver can find them. Babel then transforms the ESM syntax via transformIgnorePatterns.
    // @actions/* and @octokit/* (and their transitive ESM deps) became ESM-only after recent major bumps.
    moduleNameMapper: {
        '^@actions/core$': '<rootDir>/node_modules/@actions/core/lib/core.js',
        '^@actions/exec$': '<rootDir>/node_modules/@actions/exec/lib/exec.js',
        '^@actions/github$': '<rootDir>/node_modules/@actions/github/lib/github.js',
        '^@actions/http-client$': '<rootDir>/node_modules/@actions/http-client/lib/index.js',
        '^@actions/([^/]+)/(.+)$': '<rootDir>/node_modules/@actions/$1/$2.js',
        '^@actions/io$': '<rootDir>/node_modules/@actions/io/lib/io.js',
        '^@octokit/graphql$': '<rootDir>/node_modules/@octokit/graphql/dist-bundle/index.js',
        '^@octokit/core$': '<rootDir>/node_modules/@octokit/core/dist-src/index.js',
        '^@octokit/plugin-rest-endpoint-methods$': '<rootDir>/node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/index.js',
        '^@octokit/plugin-paginate-rest$': '<rootDir>/node_modules/@octokit/plugin-paginate-rest/dist-bundle/index.js',
        '^@octokit/auth-token$': '<rootDir>/node_modules/@octokit/auth-token/dist-bundle/index.js',
        '^@octokit/request$': '<rootDir>/node_modules/@octokit/request/dist-bundle/index.js',
        '^@octokit/endpoint$': '<rootDir>/node_modules/@octokit/endpoint/dist-bundle/index.js',
        '^@octokit/request-error$': '<rootDir>/node_modules/@octokit/request-error/dist-src/index.js',
        '^universal-user-agent$': '<rootDir>/node_modules/universal-user-agent/index.js',
        '^before-after-hook$': '<rootDir>/node_modules/before-after-hook/index.js',
        // package.json and "type":"module" requires import statements to use .js extension. Which then doesn't work for UTs. This is undo for UTs.
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transformIgnorePatterns: ['/node_modules/(?!(@actions|@octokit|universal-user-agent|before-after-hook|tunnel)/)'],
};
