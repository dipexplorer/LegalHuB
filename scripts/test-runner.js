#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

// Available test suites
const testSuites = [
    "appointment",
    "article",
    "chat",
    "dictionary",
    "document",
    "healthCheck",
    "lawyer",
    "review",
    "rights",
    "search",
    "user",
];

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    coverage: args.includes("--coverage"),
    watch: args.includes("--watch"),
    verbose: args.includes("--verbose"),
    specific: null,
    list: args.includes("--list"),
};

// Extract specific test suite if provided
const specificIndex = args.findIndex((arg) => arg.startsWith("--test="));
if (specificIndex !== -1) {
    options.specific = args[specificIndex].split("=")[1];
}

// Show help
if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: npm run test:suite [options]

Options:
  --test=<suite>    Run specific test suite (e.g., --test=appointment)
  --coverage        Generate coverage reports
  --watch           Run tests in watch mode
  --verbose         Show verbose output
  --list            List available test suites
  --help, -h        Show this help message

Available test suites:
${testSuites.map((suite) => `  - ${suite}`).join("\n")}
  `);
    process.exit(0);
}

// List available test suites
if (options.list) {
    console.log("Available test suites:");
    testSuites.forEach((suite) => console.log(`  - ${suite}`));
    process.exit(0);
}

// Determine test command
function buildTestCommand() {
    let command = "npm run test";

    // Add test pattern for specific suite
    if (options.specific) {
        if (!testSuites.includes(options.specific)) {
            console.error(`Invalid test suite: ${options.specific}`);
            console.log(`Available test suites: ${testSuites.join(", ")}`);
            process.exit(1);
        }
        command += ` -- --testNamePattern="${options.specific}"`;
    }

    // Add coverage option
    if (options.coverage) {
        command = "npm run test:coverage";
    }

    // Add watch option
    if (options.watch) {
        command += " -- --watch";
    }

    // Add verbose option
    if (options.verbose) {
        command += " -- --verbose";
    }

    // Set environment variable to suppress console logs
    process.env.SUPPRESS_CONSOLE = "true";

    return command;
}

// Run the tests
try {
    const command = buildTestCommand();
    console.log(`Running: ${command}`);
    execSync(command, { stdio: "inherit" });
} catch (error) {
    console.error("\nTest execution failed");
    console.error("To see more details, run with --verbose");
    console.error("To run a specific test suite, use: npm run test:suite -- --test=<suite-name>");
    process.exit(1);
}
