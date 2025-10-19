const js = require("@eslint/js");

module.exports = [
    {
        ignores: ["node_modules/**", "dist/**"],
    },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                // Node.js globals
                console: "readonly",
                process: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                module: "writable",
                require: "readonly",
                global: "writable",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                // Browser globals for frontend files
                window: "readonly",
                document: "readonly",
                navigator: "readonly",
                localStorage: "readonly",
                fetch: "readonly",
                Event: "readonly",
                Notification: "readonly",
                URL: "readonly",
                alert: "readonly",
                prompt: "readonly",
                IntersectionObserver: "readonly",
                // Service Worker globals
                self: "readonly",
                clients: "readonly",
                // Jest globals
                beforeAll: "readonly",
                afterAll: "readonly",
                describe: "readonly",
                test: "readonly",
                it: "readonly",
                expect: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
                jest: "readonly",
            },
        },
        rules: {
            "no-unused-vars": "off",
            "no-console": "off",
            "no-useless-escape": "off",
            "no-empty": "off",
            "no-useless-catch": "off",
        },
    },
];
