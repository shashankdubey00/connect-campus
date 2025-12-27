import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthSuccess from './pages/AuthSuccess';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP from './pages/VerifyOTP';
import ChangePassword from './pages/ChangePassword';
import SetPassword from './pages/SetPassword';
import About from './pages/About';
import Chat from './pages/Chat';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/auth/success" element={<AuthSuccess />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

