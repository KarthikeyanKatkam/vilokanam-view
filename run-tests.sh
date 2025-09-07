#!/bin/bash

# Run all tests for Vilokanam-view

echo "Running tests for Vilokanam-view..."

# Run SDK tests
echo "Running SDK tests..."
cd frontend/packages/sdk
npm test

# Run UI tests
echo "Running UI tests..."
cd ../ui
npm test

echo "All tests completed!"