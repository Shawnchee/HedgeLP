# Contributing to HedgeLP

First off, thank you for considering contributing to HedgeLP! 🎉

This document provides guidelines and steps for contributing. By participating in this project, you agree to abide by our [Code of Conduct](#code-of-conduct).

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)

---

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

### Our Standards

- **Be Respectful**: Treat everyone with respect. No harassment, discrimination, or offensive language.
- **Be Constructive**: Provide helpful feedback. Criticism should be constructive and aimed at improving the project.
- **Be Collaborative**: Work together. Open source is about community.

---

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check if the issue has already been reported.

When creating a bug report, include:

1. **Clear Title**: Summarize the issue.
2. **Steps to Reproduce**: Detailed steps to reproduce the behavior.
3. **Expected Behavior**: What you expected to happen.
4. **Actual Behavior**: What actually happened.
5. **Environment**: Browser, OS, Node version, etc.
6. **Screenshots/Logs**: If applicable.

### Suggesting Enhancements

We welcome feature suggestions! Please:

1. **Check Existing Issues**: Someone may have already suggested it.
2. **Be Specific**: Clearly describe the feature and its benefits.
3. **Provide Context**: Explain the use case and why it matters.

### Pull Requests

1. **Fork the Repository**
2. **Create a Branch**: Use a descriptive name like `feature/add-new-pool` or `fix/rebalance-bug`.
3. **Make Your Changes**: Follow the style guidelines below.
4. **Write Tests**: Ensure your changes are covered by tests.
5. **Run Tests**: Make sure all tests pass.
6. **Commit**: Use conventional commit messages.
7. **Push**: Push your branch to your fork.
8. **Open a PR**: Fill out the PR template completely.

---

## Development Setup

### Prerequisites

- Bun 1.0+
- Git
- (Optional) Foundry for smart contracts

### Frontend Setup

```bash
# Clone your fork
git clone https://github.com/Shawnchee/HedgeLP.git
cd HedgeLP

# Install dependencies
bun install

# Start development server
bun run dev
```

### Smart Contract Setup

```bash
cd contracts

# Install Foundry dependencies
forge install

# Build
forge build

# Test
forge test -vvv
```

---

## Style Guidelines

### TypeScript/JavaScript

- Use **TypeScript** for all new code.
- Follow the existing code style (enforced by ESLint and Prettier).
- Use **functional components** with hooks in React.
- Prefer **named exports** over default exports.

```typescript
// ✅ Good
export function MyComponent() { ... }

// ❌ Avoid
export default function MyComponent() { ... }
```

### Solidity

- Follow the [Solidity Style Guide](https://docs.soliditylang.org/en/v0.8.24/style-guide.html).
- Use NatSpec comments for all public functions.
- Prefer explicit types over `var`.

```solidity
// ✅ Good
/**
 * @notice Opens a short position
 * @param token The token to short
 * @param size The position size in USD
 */
function openShort(address token, uint256 size) external returns (bytes32);
```

### CSS/Tailwind

- Use Tailwind utility classes.
- Avoid custom CSS unless absolutely necessary.
- Follow the existing color palette defined in `globals.css`.

---

## Commit Messages

We use **Conventional Commits** for clear and standardized commit messages.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, no logic change) |
| `refactor` | Code refactoring (no feature or bug fix) |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks (dependencies, configs) |

### Examples

```
feat(vault): add emergency withdrawal function

Allows users to withdraw all funds in case of protocol emergency.

Closes #42
```

```
fix(hook): correct rebalance threshold calculation

The threshold was being calculated as basis points instead of percentage.
```

---

## Questions?

If you have any questions, feel free to:

1. Open a [GitHub Discussion](https://github.com/Shawnchee/HedgeLP/discussions)
2. Reach out to the maintainers

Thank you for contributing! 🙌
