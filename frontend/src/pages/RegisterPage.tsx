import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('Student');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await authService.register({ email, password, firstName, lastName, role });
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Register</h1>
      {error && <p style={{ color: 'red', padding: '0.5rem', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</p>}
      {success && <p style={{ color: 'green', padding: '0.5rem', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>{success}</p>}
      <form onSubmit={handleRegister}>
        <div style={{ marginBottom: '1rem' }}>
          <label>First Name:</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Last Name:</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Role:</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
            <option value="Student">Student</option>
            <option value="Employer">Employer</option>
            <option value="Administrator">Administrator</option>
          </select>
        </div>
        <button type="submit" style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Register
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;
