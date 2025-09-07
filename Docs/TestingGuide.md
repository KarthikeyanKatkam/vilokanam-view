# Testing the Vilokanam Design System

## Overview

This document explains how to run tests for the Vilokanam Design System components to ensure they function correctly and maintain quality standards.

## Prerequisites

Before running tests, ensure you have:

1. Node.js installed (v18 or higher)
2. pnpm package manager installed
3. All dependencies installed (`pnpm install`)

## Running Tests

### Run All Tests

To run all tests for the UI package:

```bash
cd frontend/packages/ui
pnpm test
```

### Run Tests in Watch Mode

To run tests in watch mode (automatically re-run tests when files change):

```bash
cd frontend/packages/ui
pnpm test --watch
```

### Run Specific Test Files

To run tests for specific components:

```bash
cd frontend/packages/ui
pnpm test design-system
```

### Run Tests with Coverage

To run tests and generate coverage reports:

```bash
cd frontend/packages/ui
pnpm test --coverage
```

## Test Structure

Tests are organized in the `src/__tests__` directory:

```
src/
├── __tests__/
│   ├── design-system.test.tsx
│   ├── setup.ts
│   └── components/
│       ├── WebRTCBroadcaster.test.tsx
│       └── WebRTCViewer.test.tsx
```

## Writing New Tests

### Test File Naming

- Test files should end with `.test.tsx` or `.test.ts`
- Place test files in the `__tests__` directory
- Name test files to match the component they're testing

### Test Structure

Tests follow the Arrange-Act-Assert pattern:

```tsx
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Arrange
    render(<Component />);
    
    // Act
    const element = screen.getByText('Expected Text');
    
    // Assert
    expect(element).toBeInTheDocument();
  });
});
```

## Available Test Utilities

### Rendering Components

```tsx
import { render, screen } from '@testing-library/react';

// Render a component
render(<Button>Click Me</Button>);

// Find elements
screen.getByText('Click Me');
screen.getByRole('button');
```

### User Interactions

```tsx
import { render, screen, fireEvent } from '@testing-library/react';

// Simulate user actions
fireEvent.click(button);
fireEvent.change(input, { target: { value: 'New Value' } });
```

### Async Operations

```tsx
import { render, screen, waitFor } from '@testing-library/react';

// Wait for async operations
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

## Mocking Dependencies

### Mocking SDK Functions

```tsx
jest.mock('sdk', () => ({
  useTickStream: () => ({
    tickCount: 5,
    isConnected: true,
    error: null
  }),
  signalingClient: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    // ... other methods
  }
}));
```

### Mocking Browser APIs

```tsx
// Mock media devices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    enumerateDevices: jest.fn().mockResolvedValue([
      { deviceId: 'camera1', label: 'Front Camera', kind: 'videoinput' }
    ]),
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    })
  }
});
```

## Continuous Integration

Tests are automatically run in the CI pipeline using GitHub Actions. The workflow includes:

1. Installing dependencies
2. Running all tests
3. Generating coverage reports
4. Reporting test results

## Best Practices

### Test Organization

1. Group related tests in `describe` blocks
2. Use clear, descriptive test names
3. Keep tests focused on single behaviors
4. Use setup/teardown functions appropriately

### Test Reliability

1. Avoid implementation details in assertions
2. Use semantic queries (getByRole, getByLabelText)
3. Mock external dependencies
4. Clean up after each test

### Performance

1. Use shallow rendering when possible
2. Mock heavy dependencies
3. Limit the scope of each test
4. Use `beforeEach` for common setup

## Troubleshooting

### Common Issues

1. **Tests failing due to missing mocks**:
   - Add required mocks for SDK functions
   - Mock browser APIs (localStorage, mediaDevices, etc.)

2. **Async tests timing out**:
   - Use `waitFor` for async operations
   - Increase timeout if needed

3. **DOM elements not found**:
   - Use semantic queries instead of CSS selectors
   - Check component rendering in isolation

### Debugging Tips

1. Use `screen.debug()` to inspect the DOM
2. Add `console.log` statements for debugging
3. Run tests in watch mode for faster iteration
4. Use focused tests (`it.only`) for debugging specific cases

## Coverage Targets

We aim for the following coverage targets:

- **Statements**: 80%
- **Branches**: 70%
- **Functions**: 85%
- **Lines**: 80%

Coverage reports are generated automatically and can be viewed in the `coverage/` directory after running tests.

## Updating Tests

When modifying components:

1. Update corresponding test files
2. Add new tests for new functionality
3. Remove obsolete tests
4. Ensure all tests pass before committing

## Questions and Support

For questions about testing or to report issues:

1. Open an issue on the GitHub repository
2. Contact the development team
3. Refer to the testing documentation in the Docs folder