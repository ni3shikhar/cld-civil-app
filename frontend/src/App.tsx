import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';

// Import pages
import StudentDashboard from './pages/StudentDashboard';
import EmployerDashboard from './pages/EmployerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';

// Import components
import Navigation from './components/Navigation';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <Navigation />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/employer" element={<EmployerDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  );
}

export default App;
