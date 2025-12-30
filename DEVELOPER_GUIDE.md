# Connect Campus - Developer Guide

Quick reference guide for developers working on Connect Campus.

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd connect-campus
npm run install:all

# 2. Set up environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your values

# 3. Start development
npm run dev
```

## 📁 Project Structure

```
connect-campus/
├── backend/
│   ├── config/          # DB connection
│   ├── src/
│   │   ├── controllers/ # Business logic
│   │   ├── middleware/  # Express middleware
│   │   ├── models/      # Mongoose models
│   │   ├── routes/      # API routes
│   │   ├── socket/      # Socket.IO handlers
│   │   └── utils/       # Helper functions
│   └── index.js         # Server entry
├── frontend/
│   └── src/
│       ├── components/  # Reusable components
│       ├── pages/       # Page components
│       ├── services/    # API services
│       └── contexts/    # React contexts
└── docs/               # Documentation
```

## 🔧 Common Tasks

### Adding a New API Endpoint

1. **Create Controller Function** (`backend/src/controllers/`)
   ```javascript
   /**
    * Description of what this endpoint does
    * @route POST /api/resource/action
    * @access Private
    */
   export const myAction = async (req, res) => {
     try {
       // Your logic here
       res.json({ success: true, data: result });
     } catch (error) {
       logger.error('Error in myAction', { error });
       res.status(500).json({ success: false, message: 'Error message' });
     }
   };
   ```

2. **Add Route** (`backend/src/routes/`)
   ```javascript
   import { myAction } from '../controllers/myController.js';
   router.post('/action', protect, myAction);
   ```

3. **Add to Main Router** (`backend/index.js`)
   ```javascript
   app.use('/api/resource', resourceRoutes);
   ```

### Adding a New Frontend Component

1. **Create Component** (`frontend/src/components/`)
   ```jsx
   /**
    * ComponentName - Brief description
    * @param {Object} props - Component props
    */
   const ComponentName = ({ prop1, prop2 }) => {
     // Component logic
     return <div>...</div>;
   };
   
   export default ComponentName;
   ```

2. **Create Styles** (`ComponentName.css`)
   ```css
   .component-name {
     /* Styles */
   }
   ```

3. **Use in Pages/Components**
   ```jsx
   import ComponentName from '../components/ComponentName';
   ```

### Adding a New Service Function

1. **Add to Service File** (`frontend/src/services/`)
   ```javascript
   /**
    * Description of what this function does
    * @param {string} param1 - Description
    * @returns {Promise<Object>} Response data
    */
   export const myServiceFunction = async (param1) => {
     return await api('/api/endpoint', {
       method: 'POST',
       body: JSON.stringify({ param1 }),
     });
   };
   ```

## 🗄 Database Operations

### Creating a Model

```javascript
import mongoose from 'mongoose';

const mySchema = new mongoose.Schema({
  field1: { type: String, required: true },
  field2: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Add indexes for frequently queried fields
mySchema.index({ field1: 1 });

export default mongoose.model('MyModel', mySchema);
```

### Common Queries

```javascript
// Find one
const item = await Model.findOne({ field: value });

// Find many
const items = await Model.find({ field: value }).limit(10);

// Create
const newItem = await Model.create({ field: value });

// Update
await Model.findByIdAndUpdate(id, { field: newValue });

// Delete
await Model.findByIdAndDelete(id);
```

## 🔐 Authentication

### Protecting Routes

```javascript
import { protect } from '../middleware/authMiddleware.js';

router.get('/protected', protect, async (req, res) => {
  // req.user contains authenticated user
  const userId = req.user.userId;
});
```

### Getting Current User

```javascript
// Backend (in protected route)
const userId = req.user.userId;

// Frontend
import { verifyAuth } from '../services/authService.js';
const { user } = await verifyAuth();
```

## 📡 API Calls

### Backend to Frontend

```javascript
// Frontend service
import api from '../services/api.js';

const response = await api('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify({ data }),
});
```

### Error Handling

```javascript
try {
  const response = await api('/api/endpoint');
  // Handle success
} catch (error) {
  // error.response.data contains error details
  console.error('API Error:', error.response?.data?.message);
}
```

## 🔌 Socket.IO

### Emitting Events

```javascript
// Frontend
import { getSocket } from '../services/socketService.js';
const socket = getSocket();
socket.emit('event-name', data);
```

### Listening to Events

```javascript
// Frontend
import { onEvent } from '../services/socketService.js';
onEvent('event-name', (data) => {
  // Handle event
});
```

## 🐛 Debugging

### Backend Logging

```javascript
import logger from '../utils/logger.js';

logger.info('Info message', { context: 'data' });
logger.error('Error message', { error, context });
logger.debug('Debug message', { data });
```

### Frontend Debugging

- Use React DevTools
- Check browser console
- Use Network tab for API calls
- Use React Profiler for performance

## ⚡ Performance Tips

### Backend

- Use `.lean()` for read-only queries
- Add indexes for frequently queried fields
- Use aggregation for complex queries
- Cache frequently accessed data

### Frontend

- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers
- Lazy load routes
- Optimize images

## 🧪 Testing

### Manual Testing Checklist

- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on mobile
- [ ] Test error scenarios
- [ ] Test authentication flows
- [ ] Test real-time features

## 📝 Code Style

### Naming Conventions

- Variables/Functions: `camelCase`
- Components/Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: Match export name

### Comments

```javascript
/**
 * Function description
 * @param {Type} paramName - Parameter description
 * @returns {Type} Return description
 */
```

## 🚨 Common Issues

### MongoDB Connection Error

- Check `MONGODB_URI` in `.env`
- Verify network connectivity
- Check MongoDB Atlas IP whitelist

### CORS Errors

- Verify `CLIENT_URL` in backend `.env`
- Check CORS configuration in `backend/index.js`

### Authentication Issues

- Check JWT_SECRET is set
- Verify cookie settings
- Check token expiration

## 📚 Resources

- [React Docs](https://react.dev)
- [Express Guide](https://expressjs.com/en/guide/routing.html)
- [Mongoose Docs](https://mongoosejs.com/docs/guide.html)
- [Socket.IO Docs](https://socket.io/docs/v4)

---

**Need Help?** Check [CONTRIBUTING.md](./CONTRIBUTING.md) or [ARCHITECTURE.md](./ARCHITECTURE.md)

