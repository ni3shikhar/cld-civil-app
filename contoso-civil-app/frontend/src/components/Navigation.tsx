import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks';
import { logout } from '../slices/authSlice';

const Navigation: React.FC = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const getDashboardLink = () => {
    switch (auth.role?.toLowerCase()) {
      case 'employer': return '/employer';
      case 'administrator': return '/admin';
      default: return '/student';
    }
  };

  const displayName = auth.firstName && auth.lastName 
    ? `${auth.firstName} ${auth.lastName}` 
    : auth.role || 'User';

  return (
    <nav style={{ padding: '1rem', backgroundColor: '#1976D2', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
        <Link to={auth.isAuthenticated ? getDashboardLink() : '/'} style={{ color: 'white', textDecoration: 'none', fontSize: '1.5rem', fontWeight: 'bold' }}>
          Contoso Civil App
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {auth.isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowDropdown(!showDropdown)} 
                style={{ 
                  padding: '0.5rem 1rem', 
                  cursor: 'pointer', 
                  backgroundColor: 'rgba(255,255,255,0.1)', 
                  border: '1px solid rgba(255,255,255,0.3)', 
                  borderRadius: '4px', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {auth.firstName?.charAt(0).toUpperCase() || 'U'}
                </span>
                <span>{displayName}</span>
                <span style={{ fontSize: '0.7rem' }}>▼</span>
              </button>
              {showDropdown && (
                <div style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  right: 0, 
                  marginTop: '0.5rem',
                  backgroundColor: 'white', 
                  borderRadius: '8px', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
                  minWidth: '200px',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>{displayName}</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>{auth.role}</p>
                  </div>
                  <Link 
                    to="/profile" 
                    onClick={() => setShowDropdown(false)}
                    style={{ display: 'block', padding: '0.75rem 1rem', color: '#333', textDecoration: 'none', borderBottom: '1px solid #eee' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    My Profile
                  </Link>
                  <Link 
                    to={getDashboardLink()} 
                    onClick={() => setShowDropdown(false)}
                    style={{ display: 'block', padding: '0.75rem 1rem', color: '#333', textDecoration: 'none', borderBottom: '1px solid #eee' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    Dashboard
                  </Link>
                  <button 
                    onClick={() => { setShowDropdown(false); handleLogout(); }}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', backgroundColor: 'white', color: '#f44336', textAlign: 'left', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffebee'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 1rem' }}>
                Login
              </Link>
              <Link to="/register" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
