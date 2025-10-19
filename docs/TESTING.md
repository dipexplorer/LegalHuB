# Testing Guide for LegalHuB

This document provides information about the testing setup for LegalHuB and how to run tests manually.

## Test Structure

The tests are located in the `__tests__` directory and are organized by feature:
- `appointment.test.js` - Tests for appointment functionality
- `article.test.js` - Tests for article functionality
- `chat.test.js` - Tests for chat functionality
- `dictionary.test.js` - Tests for dictionary functionality
- `document.test.js` - Tests for document functionality
- `healthCheck.test.js` - Tests for health check endpoint
- `lawyer.test.js` - Tests for lawyer functionality
- `review.test.js` - Tests for review functionality
- `rights.test.js` - Tests for rights functionality
- `search.test.js` - Tests for search functionality
- `user.test.js` - Tests for user functionality

## Test Configuration

Tests use Jest as the testing framework with the following configuration:
- Test environment: Node.js
- Database: In-memory MongoDB (using mongodb-memory-server)
- Test timeout: 60 seconds
- Maximum workers: 1 (to prevent database conflicts)

## Running Tests Locally

### Basic Test Run

To run all tests:
```bash
npm test
```

### Running Tests with Coverage

To run tests with coverage reports:
```bash
npm run test:coverage
```

This will generate coverage reports in the `coverage` directory.

### Running Tests for CI

To run tests in CI mode (with JUnit output):
```bash
npm run test:ci
```

This will generate JUnit XML reports in the `test-results` directory.

## Continuous Integration

LegalHuB uses GitHub Actions for continuous integration. The test workflow is defined in `.github/workflows/test.yml` and does the following:

1. Runs tests on multiple Node.js versions (18 and 20)
2. Generates coverage reports
3. Uploads coverage to Codecov (if configured)
4. Provides test summaries

### Manual Triggering

You can manually trigger the test workflow from the GitHub UI:
1. Go to the "Actions" tab in your GitHub repository
2. Select "Test Suite" from the workflow list
3. Click "Run workflow" and choose the branch you want to test

### CI/CD Pipeline

The main CI/CD pipeline is defined in `.github/workflows/ci_cd.yml` and includes:
1. Linting code
2. Running tests
3. Deploying to production (only on main branch pushes)

## Test Database

Tests use an in-memory MongoDB instance that's created and destroyed for each test run. This ensures tests are isolated and don't affect each other.

## Writing New Tests

When writing new tests:
1. Place test files in the `__tests__` directory
2. Name files following the pattern `feature.test.js`
3. Use the same test structure as existing tests
4. Make sure to clean up any resources after tests

## Debugging Tests

To debug a specific test:
1. Add `--testNamePattern="your test name"` to the test command
2. For example: `npm test -- --testNamePattern="should return 200 OK"`

## Coverage Reports

Coverage reports are generated when running tests with the `--coverage` flag. The reports include:
- Text summary in the console
- HTML report in `coverage/lcov-report/index.html`
- LCOV data in `coverage/lcov.info`

To view the HTML coverage report:
1. Run `npm run test:coverage`
2. Open `coverage/lcov-report/index.html` in your browser
