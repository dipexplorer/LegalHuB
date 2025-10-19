#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create coverage directory if it doesn't exist
const coverageDir = path.join(process.cwd(), 'coverage');

if (!fs.existsSync(coverageDir)) {
  fs.mkdirSync(coverageDir, { recursive: true });
  console.log('Created coverage directory');
}

// Create test-results directory if it doesn't exist
const testResultsDir = path.join(process.cwd(), 'test-results');

if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
  console.log('Created test-results directory');
}

console.log('Coverage environment prepared');
