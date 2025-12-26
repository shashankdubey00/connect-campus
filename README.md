# Connect Campus

A modern landing page for connecting students from colleges and beyond.

## Project Structure

```
connect-campus/
├── frontend/          # React + Vite frontend application
│   ├── src/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── backend/           # Express.js + MongoDB backend
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── index.js
│   └── package.json
├── package.json       # Root package.json for running both
└── README.md
```

## Features

- **Responsive Navbar**: Transparent when at top, solid when scrolling
- **Hero Section**: Beautiful hero section with live college search
- **Vision Section**: Our vision for college communities
- **About Page**: Detailed information about Connect Campus
- **Footer**: Complete footer with links and resources
- **Live College Search**: Real-time search suggestions from MongoDB Atlas
- **State & District Filters**: Optional filters for refined search
- **Modern Design**: Dark theme with blue and green accents
- **Animations**: Smooth animations and transitions throughout
- **Mobile Friendly**: Fully responsive design

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account with connection string
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd connect-campus
```

2. Install all dependencies (root, frontend, and backend):

```bash
npm run install:all
```

Or install separately:

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Set up environment variables:
   - Copy `backend/.env.example` to `backend/.env`
   - Add your MongoDB Atlas connection string:
   ```
   MONGODB_URI=your_mongodb_atlas_connection_string_here
   PORT=5000
   ```

### Running the Application

#### Development Mode (Frontend + Backend)

Run both frontend and backend concurrently from root:

```bash
npm run dev
```

This will start:

- Backend server on `http://localhost:5000`
- Frontend dev server on `http://localhost:5173` (or the port Vite assigns)

#### Run Separately

**Backend only:**

```bash
npm run dev:backend
# or
cd backend
npm run dev
```

**Frontend only:**

```bash
npm run dev:frontend
# or
cd frontend
npm run dev
```

### Build

**Frontend:**

```bash
npm run build:frontend
# or
cd frontend
npm run build
```

**Backend:**
The backend doesn't need building, just run it directly.

### Production

**Start backend:**

```bash
npm run start:backend
# or
cd backend
npm start
```

**Frontend preview:**

```bash
cd frontend
npm run preview
```

## Database Schema

The application uses an existing MongoDB Atlas database with the following College schema:

```javascript
{
  aisheCode: String (unique),
  name: String,
  state: String,
  district: String,
  searchText: String
}
```

**Existing Indexes:**

- Text index on `searchText`
- Compound index on `state + district`

**Important:** The database schema and indexes are final. Do NOT modify them.

## API Endpoints

### Search Colleges

```
GET /api/colleges/search?query=<search_term>&state=<state>&district=<district>&limit=10
```

### Get All States

```
GET /api/colleges/states
```

### Get Districts by State

```
GET /api/colleges/districts?state=<state_name>
```

## Tech Stack

- **Frontend**: React 18, Vite
- **Backend**: Express.js, Node.js
- **Database**: MongoDB Atlas
- **Styling**: CSS3 with animations

## Features in Detail

### Live College Search

- Real-time search suggestions as you type
- Debounced search (300ms delay)
- Maximum 10 results
- Prioritized by relevance
- Loading states and empty states handled

### Filters

- **State Filter**: Optional, loads all available states
- **District Filter**: Disabled until a state is selected
- Filters work in combination with text search
- Search works without any filters

### Responsive Design

- Mobile-first approach
- Optimized for tablets and desktops
- Touch-friendly interface
- Adaptive layouts

## Environment Variables

Create a `.env` file in the `backend/` directory:

```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

## License

This project is private and proprietary.
