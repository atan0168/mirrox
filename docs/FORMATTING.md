# Code Formatting Guide

This project uses **Prettier** for code formatting and **ESLint** for linting to maintain consistent code style across the codebase.

## Quick Start

### Format Everything

```bash
npm run format
```

### Check Formatting (without fixing)

```bash
npm run format:check
```

### Format Specific Projects

```bash
npm run format:app      # Format only the React Native app
npm run format:backend  # Format only the Node.js backend
```

### Linting

```bash
npm run lint            # Run linting for both projects
npm run lint:app        # Lint only the app
npm run lint:backend    # Lint only the backend
```

### Project-Specific Commands

#### App (React Native)

```bash
cd app
npm run format          # Format app files
npm run format:check    # Check app formatting
npm run lint            # Lint app files
npm run lint:fix        # Fix app linting issues
```

#### Backend (Node.js)

```bash
cd backend
npm run format          # Format backend files
npm run format:check    # Check backend formatting
npm run lint            # Lint backend files
npm run lint:fix        # Fix backend linting issues
```

## Configuration

### Prettier Configuration (`.prettierrc`)

- **Semi-colons**: Required
- **Quotes**: Single quotes
- **Print Width**: 80 characters
- **Tab Width**: 2 spaces
- **Trailing Commas**: ES5 compatible

### ESLint Configuration

- **App**: React Native + TypeScript rules
- **Backend**: Node.js + TypeScript rules

## IDE Integration

### VS Code

Install these extensions for automatic formatting:

- **Prettier - Code formatter**
- **ESLint**

Add to your VS Code settings:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Other IDEs

Most modern IDEs support Prettier and ESLint. Check your IDE's documentation for setup instructions.

## Pre-commit Hooks (Optional)

To automatically format code before commits, you can set up pre-commit hooks:

```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "**/*.{js,jsx,ts,tsx,json,css,scss,md}": ["prettier --write", "git add"],
    "**/*.{js,jsx,ts,tsx}": ["eslint --fix", "git add"]
  }
}
```
