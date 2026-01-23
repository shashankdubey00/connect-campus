# Contributing to Connect Campus

Thank you for your interest in contributing to Connect Campus! This guide will help you understand our codebase structure, coding standards, and development workflow.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Code Structure](#code-structure)
- [Coding Standards](#coding-standards)
- [Development Workflow](#development-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)

## 🚀 Getting Started

### Prerequisites

- Node.js v16 or higher
- MongoDB Atlas account (or local MongoDB)
- Git
- Basic knowledge of:
  - React (Frontend)
  - Express.js (Backend)
  - MongoDB/Mongoose

### Initial Setup

1. **Fork and Clone**
   ```bash
   git clone <your-fork-url>
   cd connect-campus
   ```

2. **Install Dependencies**
   ```bash
   npm run install:all
   ```

3. **Set Up Environment Variables**
   - Copy `backend/.env.example` to `backend/.env`
   - Fill in all required variables (see `.env.example` for details)

4. **Start Development Servers**
   ```bash
   npm run dev
   ```

## 📁 Code Structure

### Backend Structure

```
backend/
├── config/              # Configuration files
│   ├── db.js           # MongoDB connection
│   └── env.js          # Environment validation
├── src/
│   ├── config/         # Additional config (passport, etc.)
│   ├── controllers/    # Business logic (one per feature)
│   ├── middleware/     # Express middleware
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API route definitions
│   ├── socket/         # Socket.IO handlers
│   └── utils/          # Helper functions
├── routes/             # Legacy routes (collegeRoutes)
└── index.js            # Server entry point
```

### Frontend Structure

```
frontend/src/
├── components/         # Reusable UI components
├── pages/             # Page-level components
├── services/          # API service functions
├── contexts/          # React contexts
└── App.jsx            # Main app component
```

### Key Principles

1. **Separation of Concerns**: Controllers handle business logic, routes handle routing, models handle data
2. **Single Responsibility**: Each file/function should do one thing well
3. **DRY (Don't Repeat Yourself)**: Extract common code into utilities
4. **Consistent Naming**: Use clear, descriptive names

## 📝 Coding Standards

### JavaScript/Node.js

1. **Use ES6+ Features**
   - Prefer `const` over `let`, avoid `var`
   - Use arrow functions for callbacks
   - Use async/await over promises

2. **Error Handling**
   ```javascript
   // ✅ Good
   try {
     const result = await someAsyncOperation();
     return res.json({ success: true, data: result });
   } catch (error) {
     logger.error('Operation failed', { error, context });
     return res.status(500).json({ 
       success: false, 
       message: 'Operation failed' 
     });
   }

   // ❌ Bad
   someAsyncOperation().then(result => {
     res.json(result);
   });
   ```

3. **Code Comments**
   - Add JSDoc comments for all functions
   - Explain "why" not "what" in comments
   - Keep comments up-to-date with code

4. **Naming Conventions**
   - Variables/Functions: `camelCase`
   - Classes/Components: `PascalCase`
   - Constants: `UPPER_SNAKE_CASE`
   - Files: Match the main export (e.g., `User.js` exports `User`)

### React/Frontend

1. **Component Structure**
   ```jsx
   // ✅ Good - Clear structure
   const MyComponent = () => {
     // 1. Hooks
     const [state, setState] = useState();
     useEffect(() => {}, []);
     
     // 2. Handlers
     const handleClick = () => {};
     
     // 3. Render
     return <div>...</div>;
   };
   ```

2. **Performance**
   - Use `useMemo` for expensive calculations
   - Use `useCallback` for event handlers passed to children
   - Avoid unnecessary re-renders

3. **State Management**
   - Use local state for component-specific data
   - Use context for shared state
   - Keep state as close to where it's used as possible

### Database

1. **Queries**
   - Always use indexes for frequently queried fields
   - Use `.lean()` for read-only queries
   - Limit results with `.limit()`
   - Use aggregation for complex queries

2. **Migrations**
   - Document schema changes
   - Consider backward compatibility
   - Test migrations on staging first

## 🔄 Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### Commit Messages

Follow conventional commits:

```
type(scope): subject

body (optional)

footer (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(auth): add password reset functionality
fix(chat): resolve message delivery delay
docs(readme): update installation instructions
```

### Before Committing

1. **Run Linter** (if configured)
   ```bash
   npm run lint
   ```

2. **Test Your Changes**
   - Test manually in browser
   - Check console for errors
   - Verify API endpoints work

3. **Check Code Quality**
   - Remove console.logs (use logger instead)
   - Remove commented code
   - Ensure consistent formatting

## 🧪 Testing Guidelines

### Manual Testing Checklist

- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices
- [ ] Test error scenarios (network failures, invalid inputs)
- [ ] Test authentication flows
- [ ] Verify API responses match frontend expectations

### Testing New Features

1. Test happy path (normal flow)
2. Test error cases
3. Test edge cases (empty inputs, very long inputs, etc.)
4. Test with different user roles/permissions

## 🔀 Pull Request Process

### Before Submitting

1. **Update Documentation**
   - Update README if needed
   - Add/update code comments
   - Update API docs if endpoints changed

2. **Check for Conflicts**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

3. **Write Clear PR Description**
   - What changed and why
   - How to test
   - Screenshots (for UI changes)
   - Related issues

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings/errors
```

## 👀 Code Review Guidelines

### For Authors

- Be open to feedback
- Respond to all comments
- Make requested changes promptly
- Ask questions if unclear

### For Reviewers

- Be constructive and respectful
- Explain why changes are needed
- Approve when satisfied
- Request changes for:
  - Security issues
  - Performance problems
  - Code quality issues
  - Missing tests/documentation

## 🐛 Reporting Bugs

Use GitHub Issues with:

1. **Clear Title**: Brief description
2. **Steps to Reproduce**: Detailed steps
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: Browser, OS, Node version
6. **Screenshots**: If applicable

## 💡 Suggesting Features

1. Check if feature already exists
2. Describe the use case
3. Explain the benefit
4. Consider implementation complexity

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Mongoose Documentation](https://mongoosejs.com/docs/guide.html)
- [Socket.IO Documentation](https://socket.io/docs/v4)

## ❓ Questions?

- Open a GitHub Discussion
- Check existing issues
- Review code comments
- Ask in team chat (if applicable)

---

**Thank you for contributing to Connect Campus!** 🎉














