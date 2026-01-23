# Connect Campus - Beginner's Guide 🎓

Welcome to **Connect Campus**! This is a comprehensive guide to help you understand and work with this project as a beginner.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Key Concepts](#key-concepts)
7. [File Organization](#file-organization)
8. [Running the Project](#running-the-project)
9. [Deployment](#deployment)
10. [Common Tasks](#common-tasks)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

**Connect Campus** is a real-time messaging and social platform designed for college students. It allows students to:
- Join their college community
- Chat with other students in real-time
- Create and manage groups
- Send direct messages
- Follow colleges and stay updated
- Verify their college identity

Think of it as a **WhatsApp + Slack hybrid** specifically built for college communities.

---

## 🛠 Tech Stack

### Frontend
- **React 18** - UI library for building interactive interfaces
- **Vite** - Fast build tool and development server
- **CSS3** - Styling with custom theme support (dark mode)
- **Socket.IO Client** - Real-time communication
- **React Router** - Navigation between pages

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework for APIs
- **MongoDB** - NoSQL database
- **Socket.IO** - Real-time bidirectional communication
- **Passport.js** - Authentication library
- **JWT** - Secure token-based authentication

### Deployment
- **Frontend**: Vercel (automatic deployment from GitHub)
- **Backend**: Render (automatic deployment from GitHub)
- **Database**: MongoDB Atlas (cloud database)

---

## ✨ Key Features

### 1. **Authentication & Profiles**
   - User registration and login
   - Google OAuth integration
   - Profile customization (avatar, bio)
   - College verification system

### 2. **College Communities**
   - Join colleges by searching
   - View all students in a college
   - College-specific chat rooms
   - Follow/unfollow colleges

### 3. **Direct Messaging**
   - One-on-one messaging with other users
   - Real-time message delivery
   - Read receipts (single ✓, double ✓✓)
   - Message reactions and editing

### 4. **Groups**
   - Create and manage groups
   - Add/remove members
   - Group-specific chat
   - Group settings and privacy

### 5. **Real-Time Features**
   - Live typing indicators ("User is typing...")
   - Online/offline status
   - Instant message delivery
   - Read status for messages

### 6. **Safety & Privacy**
   - Block users
   - Delete messages (for self or all)
   - Privacy settings
   - Report inappropriate content

---

## 📁 Project Structure

```
connect-campus/
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Full page views (Chat, Profile, etc.)
│   │   ├── services/           # API and Socket.IO communication
│   │   ├── contexts/           # React Context (theme, auth state)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── utils/              # Helper functions
│   │   ├── App.jsx             # Main app component
│   │   └── main.jsx            # Entry point
│   ├── public/                 # Static files
│   ├── package.json            # Dependencies
│   └── vite.config.js          # Vite configuration
│
├── backend/                     # Node.js/Express server
│   ├── src/
│   │   ├── models/             # MongoDB schemas (User, Message, etc.)
│   │   ├── controllers/        # Business logic for routes
│   │   ├── routes/             # API endpoints
│   │   ├── middleware/         # Authentication, logging, rate limiting
│   │   ├── socket/             # Real-time event handlers
│   │   ├── utils/              # Helper functions
│   │   └── config/             # Configuration files
│   ├── index.js                # Entry point
│   ├── package.json            # Dependencies
│   └── .env                    # Environment variables (secret)
│
└── Documentation files (README, guides, etc.)
```

---

## 🚀 Getting Started

### Prerequisites
Before you start, make sure you have:
- **Node.js** v16 or higher ([Download](https://nodejs.org/))
- **npm** or **yarn** (comes with Node.js)
- **Git** for version control ([Download](https://git-scm.com/))
- **MongoDB Atlas account** (free tier available at [mongodb.com](https://www.mongodb.com/cloud/atlas))
- **GitHub account** for code collaboration

### Step 1: Clone the Repository
```bash
git clone https://github.com/shashankdubey00/connect-campus.git
cd connect-campus
```

### Step 2: Setup Frontend
```bash
cd frontend
npm install                 # Install dependencies
npm run dev                # Start development server
# Frontend runs at http://localhost:5173
```

### Step 3: Setup Backend
In a new terminal:
```bash
cd backend
npm install                # Install dependencies
npm start                  # Start the server
# Backend runs at http://localhost:5000
```

### Step 4: Configure Environment
Create a `.env` file in the `backend/` folder:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
GOOGLE_CLIENT_ID=your_google_oauth_id
GOOGLE_CLIENT_SECRET=your_google_oauth_secret
NODE_ENV=development
PORT=5000
```

---

## 🧠 Key Concepts for Beginners

### 1. **Real-Time Communication (WebSocket)**
- Traditional HTTP: Client asks server, server responds (request-response)
- WebSocket: Continuous two-way connection (bidirectional)
- Used for instant messages, typing indicators, online status
- Library: `Socket.IO`

### 2. **Authentication & JWT**
- **JWT (JSON Web Token)**: A token that proves you're logged in
- Token format: `header.payload.signature`
- Sent in every request to prove identity
- Expires after a certain time (needs refresh)

### 3. **MongoDB Collections**
Think of them like Excel sheets:
- **Users**: Stores user profiles
- **Messages**: Stores college chat messages
- **DirectMessages**: Stores one-on-one messages
- **Groups**: Stores group information
- Each document = one row in the sheet

### 4. **React Concepts**
- **Components**: Reusable UI building blocks
- **State**: Data that changes (useState hook)
- **Context**: Share data between components without prop drilling
- **useEffect**: Run code when component mounts or updates
- **Hooks**: Functions that let you use React features

### 5. **API Routes**
- `/api/auth/register` - Create new user account
- `/api/auth/login` - Login user
- `/api/messages` - Get/send messages
- `/api/profile` - Get/update user profile
- etc.

---

## 📂 Important File Descriptions

### Frontend Key Files
| File | Purpose |
|------|---------|
| `src/App.jsx` | Main component, routing logic |
| `src/pages/Chat.jsx` | Main chat interface |
| `src/services/socketService.js` | WebSocket event handlers |
| `src/services/authService.js` | Authentication API calls |
| `src/contexts/ThemeContext.jsx` | Dark/light theme state |
| `src/utils/collegeLogo.js` | Helper for college logos |

### Backend Key Files
| File | Purpose |
|------|---------|
| `index.js` | Server entry point, Socket.IO setup |
| `src/models/User.js` | User database schema |
| `src/models/Message.js` | Message database schema |
| `src/controllers/authController.js` | Authentication logic |
| `src/routes/authRoutes.js` | Authentication endpoints |
| `src/socket/socketServer.js` | Real-time event handlers |

---

## ▶️ Running the Project

### Development Mode
```bash
# Terminal 1 - Frontend
cd frontend
npm run dev

# Terminal 2 - Backend
cd backend
npm start

# Terminal 3 (optional) - MongoDB (if running locally)
mongod
```

### Production Build
```bash
# Frontend
cd frontend
npm run build           # Creates optimized build
npm run preview        # Preview the build

# Backend - already in production mode on Render
```

---

## 🌐 Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Connect GitHub repo to Vercel
3. Set environment variables in Vercel dashboard
4. Auto-deploys on every push to `main` branch

### Backend (Render)
1. Push code to GitHub
2. Connect GitHub repo to Render
3. Set environment variables
4. Auto-deploys on every push to `main` branch

### Environment Variables Needed
**Frontend (.env):**
```
VITE_API_URL=your_backend_url
VITE_GOOGLE_CLIENT_ID=your_google_id
```

**Backend (.env):**
```
MONGODB_URI=cloud_database_url
JWT_SECRET=secure_random_string
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
NODE_ENV=production
FRONTEND_URL=your_frontend_url
```

---

## 📝 Common Tasks

### Adding a New Feature
1. **Backend**: Create model → controller → route
2. **Frontend**: Create component → add service → integrate with UI
3. Test locally
4. Push to GitHub
5. Verify deployment

### Fixing a Bug
1. Reproduce the bug locally
2. Find the problematic code
3. Fix it
4. Test the fix
5. Commit and push

### Styling Changes
- Edit `src/pages/Chat.css` or component CSS files
- Use CSS variables for theme consistency
- Test in both dark and light modes

### Database Changes
1. Modify the MongoDB schema in `backend/src/models/`
2. Update corresponding controller logic
3. Test with sample data

---

## 🔧 Troubleshooting

### Frontend Won't Start
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try again
npm run dev
```

### Backend Won't Connect
- Check if port 5000 is available
- Verify MongoDB connection string in `.env`
- Check if Socket.IO is connecting: open browser DevTools → Network → WS

### Messages Not Sending
- Check backend logs for errors
- Verify Socket.IO connection (green dot icon)
- Check database permissions in MongoDB Atlas
- Verify JWT token hasn't expired

### Styling Issues
- Clear browser cache (Ctrl+Shift+Delete)
- Check CSS variable names
- Verify class names match in JSX and CSS
- Test in incognito mode

### Git Merge Conflicts
```bash
# View conflicts
git status

# Resolve manually in VS Code
# Then:
git add .
git commit -m "resolve: merge conflicts"
git push
```

---

## 📚 Learning Resources

### Recommended Learning Path
1. **JavaScript Basics** - Variables, functions, ES6 syntax
2. **React Fundamentals** - Components, hooks, state
3. **Node.js/Express** - Server, routing, middleware
4. **MongoDB** - NoSQL, CRUD operations
5. **Real-time Communication** - WebSocket, Socket.IO
6. **Authentication** - JWT, OAuth

### Documentation Links
- [React Docs](https://react.dev)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Vite Guide](https://vitejs.dev/guide/)

---

## 💡 Best Practices

### Code Organization
- ✅ One component per file
- ✅ Descriptive variable names
- ✅ Comments for complex logic
- ✅ Keep components small and reusable

### Git Commits
- ✅ Write clear commit messages
- ✅ Commit related changes together
- ✅ Don't commit node_modules or .env
- ✅ Use format: `type(feature): description`

### Security
- ✅ Never commit `.env` files
- ✅ Use environment variables for secrets
- ✅ Validate user input
- ✅ Use HTTPS in production

---

## 🤝 Contributing

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Commit: `git commit -m "feat: add new feature"`
4. Push: `git push origin feature/your-feature`
5. Create Pull Request on GitHub
6. Wait for code review and merge

---

## 📞 Need Help?

- Check existing documentation files in the project
- Search GitHub Issues for similar problems
- Ask in development team chat
- Debug using browser DevTools (F12)
- Check backend logs in terminal

---

## 🎉 Next Steps

1. ✅ Set up the project locally
2. ✅ Explore the codebase
3. ✅ Make your first small change
4. ✅ Test it locally
5. ✅ Create your first PR

**Happy coding! Welcome to the Connect Campus team! 🚀**

---

**Last Updated**: January 2026
**For Questions**: Contact the development team
**GitHub Repository**: [connect-campus](https://github.com/shashankdubey00/connect-campus)
