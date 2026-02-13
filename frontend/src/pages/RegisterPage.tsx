import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('Student');
  
  // Student contact info
  const [phoneNumber, setPhoneNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('United States');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      const parts = [match[1], match[2], match[3]].filter(Boolean);
      if (parts.length === 0) return '';
      if (parts.length === 1) return parts[0];
      if (parts.length === 2) return `(${parts[0]}) ${parts[1]}`;
      return `(${parts[0]}) ${parts[1]}-${parts[2]}`;
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(formatPhoneNumber(e.target.value));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const registrationData: any = { email, password, firstName, lastName, role };
      
      // Add student contact info if role is Student
      if (role === 'Student') {
        if (phoneNumber) registrationData.phoneNumber = phoneNumber;
        if (streetAddress) registrationData.streetAddress = streetAddress;
        if (city) registrationData.city = city;
        if (state) registrationData.state = state;
        if (zipCode) registrationData.zipCode = zipCode;
        if (country) registrationData.country = country;
      }
      
      await authService.register(registrationData);
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block', marginBottom: '0.25rem', fontWeight: 500, color: '#333' };

  return (
    <div className="register-container">
      <h1 style={{ marginBottom: '1.5rem', color: '#1976D2' }}>Create Account</h1>
      {error && <div style={{ color: '#c62828', padding: '0.75rem', backgroundColor: '#ffebee', borderRadius: '6px', marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ color: '#2e7d32', padding: '0.75rem', backgroundColor: '#e8f5e9', borderRadius: '6px', marginBottom: '1rem' }}>{success}</div>}
      
      <form onSubmit={handleRegister}>
        <div className="register-form-grid" style={{ marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>First Name *</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Last Name *</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Password *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />
          <small style={{ color: '#666' }}>Minimum 6 characters</small>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Role *</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
            <option value="Student">Student</option>
            <option value="Employer">Employer</option>
          </select>
        </div>
        
        {/* Student Contact Information */}
        {role === 'Student' && (
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1976D2', fontSize: '1.1rem' }}>
              Contact Information (Optional)
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                style={inputStyle}
              />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Street Address</label>
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="123 Main Street, Apt 4B"
                style={inputStyle}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="New York"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Zip Code</label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="10001"
                  maxLength={10}
                  style={inputStyle}
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>State</label>
                <select value={state} onChange={(e) => setState(e.target.value)} style={inputStyle}>
                  <option value="">Select State</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        )}
        
        <button 
          type="submit" 
          style={{ 
            marginTop: '1.5rem',
            width: '100%',
            padding: '0.875rem', 
            cursor: 'pointer',
            backgroundColor: '#1976D2',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: 500
          }}
        >
          Create Account
        </button>
      </form>
      
      <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#666' }}>
        Already have an account? <a href="/login" style={{ color: '#1976D2' }}>Sign in</a>
      </p>
    </div>
  );
};

export default RegisterPage;
