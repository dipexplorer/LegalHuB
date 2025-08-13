module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: [
        "eslint:recommended",
        "plugin:prettier/recommended", // ✅ integrates prettier rules into eslint
    ],
    plugins: ["prettier"],
    rules: {
        "prettier/prettier": "error", // Prettier errors will show in ESLint
    },
};
