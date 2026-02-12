# Contributing Guidelines

## Project Structure Overview

```
contoso-civil-app/
├── frontend/                 # React 18 TypeScript application
├── backend/
│   ├── api-gateway/         # Main API entry point
│   └── services/
│       ├── user-service/    # User management & auth
│       ├── job-service/     # Job postings
│       ├── interview-service/ # Interview questions
│       └── application-service/ # Applications
├── database/                 # SQL Server schemas
├── .docker/                  # Docker configurations
├── docs/                     # Documentation
└── package.json             # Root package configuration
```

## Development Workflow

### 1. Fork and Clone
```bash
git clone https://github.com/yourusername/contoso-civil-app.git
cd contoso-civil-app
```

### 2. Create Feature Branch
```bash
git checkout -b feature/AmazingFeature
```

### 3. Install Dependencies
```bash
npm install --workspaces
```

### 4. Make Changes
- Write clean, TypeScript code
- Follow the existing code style
- Add comments for complex logic
- Update tests as needed

### 5. Commit Changes
```bash
git commit -m 'Add AmazingFeature'
```

### 6. Push to Branch
```bash
git push origin feature/AmazingFeature
```

### 7. Open Pull Request
- Describe your changes clearly
- Reference any related issues
- Ensure all tests pass

## Code Standards

### TypeScript Guidelines
- Use strict mode
- Type all function parameters
- Use interfaces for object types
- Avoid `any` type

### Naming Conventions
- **Classes/Interfaces**: PascalCase
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Files**: camelCase or PascalCase

### File Organization
```
service/src/
├── index.ts          # Entry point
├── routes/           # API routes
├── middleware/       # Custom middleware
├── services/         # Business logic
├── models/           # Data models
├── config/           # Configuration
└── utils/            # Utility functions
```

## Testing Requirements

```bash
# Run all tests
npm run test --workspaces

# Run specific service tests
npm run test --workspace=backend/services/user-service

# Coverage report
npm run test --workspace=frontend -- --coverage
```

## Commit Message Guidelines

Format:
```
type(scope): subject

body

footer
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/changes
- `chore`: Build, dependencies updates

Example:
```
feat(user-service): add email verification

- Implement email verification flow
- Add verification token storage
- Create verification email template

Closes #123
```

## Pull Request Process

1. Update README.md with any new features or changes
2. Add tests for new functionality
3. Ensure all tests pass: `npm run test --workspaces`
4. Update documentation in docs/ folder
5. Request at least 2 reviews before merging
6. Squash commits before merging (1 commit per feature)

## Code Review Checklist

- [ ] Code follows project style guidelines
- [ ] Changes are documented
- [ ] Tests are included and passing
- [ ] No unnecessary console.logs
- [ ] No hardcoded values (use env variables)
- [ ] Error handling is implemented
- [ ] Performance implications considered
- [ ] Security implications reviewed

## Performance Guidelines

- API response time: < 200ms (p95)
- Database queries: Indexed and optimized
- Frontend: Lazy load components
- Avoid N+1 queries

## Security Guidelines

- Never commit secrets or credentials
- Use environment variables for configuration
- Validate all inputs on backend
- Sanitize data before displaying
- Use parameterized queries
- Implement rate limiting
- Add CORS restrictions

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for functions
- Document API endpoints in docs/API.md
- Update ARCHITECTURE.md for structural changes
- Add examples for complex features

## Getting Help

- Check existing issues and discussions
- Ask in pull request comments
- Join project discussions
- Review documentation in docs/

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- GitHub contributors page
- Release notes

Thank you for contributing! 🎉
