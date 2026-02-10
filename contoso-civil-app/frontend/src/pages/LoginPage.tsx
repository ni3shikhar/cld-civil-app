import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks';
import { login } from '../slices/authSlice';
import { authService } from '../services/api';

// Civil Engineering Industry News Data
const civilIndustryNews = [
  {
    id: 1,
    title: 'Infrastructure Bill Allocates $550B for Transportation Projects',
    summary: 'The new infrastructure legislation provides unprecedented funding for bridges, highways, and public transit systems across the nation.',
    date: 'Feb 10, 2026',
    category: 'Policy',
    icon: '🏗️'
  },
  {
    id: 2,
    title: 'AI-Powered Structural Analysis Tools Gain Industry Adoption',
    summary: 'Major engineering firms report 40% efficiency gains using machine learning for structural integrity assessments.',
    date: 'Feb 9, 2026',
    category: 'Technology',
    icon: '🤖'
  },
  {
    id: 3,
    title: 'Sustainable Concrete Innovations Reduce Carbon Footprint by 30%',
    summary: 'New geopolymer cement alternatives are revolutionizing green construction practices worldwide.',
    date: 'Feb 8, 2026',
    category: 'Sustainability',
    icon: '🌱'
  },
  {
    id: 4,
    title: 'Civil Engineering Job Market Shows 15% Growth in Q1 2026',
    summary: 'Demand for structural and transportation engineers reaches record highs as infrastructure projects accelerate.',
    date: 'Feb 7, 2026',
    category: 'Careers',
    icon: '📈'
  },
  {
    id: 5,
    title: 'Smart Bridge Monitoring Systems Prevent Structural Failures',
    summary: 'IoT sensors and real-time analytics are transforming bridge maintenance and safety protocols.',
    date: 'Feb 6, 2026',
    category: 'Innovation',
    icon: '🌉'
  },
  {
    id: 6,
    title: 'ASCE Updates Design Standards for Climate Resilience',
    summary: 'New guidelines address flood-resistant foundations and heat-tolerant materials for infrastructure.',
    date: 'Feb 5, 2026',
    category: 'Standards',
    icon: '📋'
  }
];

const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    'Policy': '#1976D2',
    'Technology': '#7B1FA2',
    'Sustainability': '#388E3C',
    'Careers': '#F57C00',
    'Innovation': '#0097A7',
    'Standards': '#5D4037'
  };
  return colors[category] || '#757575';
};

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await authService.login({ email, password });
      const { token, userId, role, firstName, lastName } = response.data;
      dispatch(login({ token, userId: String(userId), role, firstName, lastName }));
      
      // Navigate to appropriate dashboard based on role
      switch (role?.toLowerCase()) {
        case 'employer':
          navigate('/employer');
          break;
        case 'administrator':
          navigate('/admin');
          break;
        case 'student':
        default:
          navigate('/student');
          break;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      {/* Left Side - Login Form */}
      <div style={{ 
        flex: '0 0 450px', 
        padding: '3rem',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '350px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ 
              color: '#1565C0', 
              marginBottom: '0.5rem',
              fontSize: '2rem'
            }}>
              🏛️ Contoso Civil
            </h1>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              Civil Engineering Career Platform
            </p>
          </div>

          <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Sign In</h2>
          
          {error && (
            <div style={{ 
              color: '#D32F2F', 
              backgroundColor: '#FFEBEE',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#444' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{ 
                  width: '100%', 
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#444' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                style={{ 
                  width: '100%', 
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button 
              type="submit" 
              style={{ 
                width: '100%',
                padding: '0.85rem', 
                backgroundColor: '#1565C0',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0D47A1'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1565C0'}
            >
              Sign In
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              Don't have an account?{' '}
              <a href="/register" style={{ color: '#1565C0', textDecoration: 'none', fontWeight: 500 }}>
                Register here
              </a>
            </p>
          </div>

          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            backgroundColor: '#E3F2FD', 
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#1565C0' }}>Demo Accounts:</p>
            <p style={{ margin: '0.25rem 0', color: '#444' }}>👨‍🎓 student@university.edu</p>
            <p style={{ margin: '0.25rem 0', color: '#444' }}>💼 employer@acmecivil.com</p>
            <p style={{ margin: '0.25rem 0', color: '#444' }}>👨‍💼 admin@contoso.com</p>
            <p style={{ marginTop: '0.5rem', color: '#666', fontStyle: 'italic' }}>Password: password123</p>
          </div>
        </div>
      </div>

      {/* Right Side - Industry News */}
      <div style={{ 
        flex: 1, 
        padding: '2rem 3rem',
        overflowY: 'auto',
        background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)'
      }}>
        <div style={{ maxWidth: '700px' }}>
          <h2 style={{ 
            color: '#ffffff', 
            marginBottom: '0.5rem',
            fontSize: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            📰 Civil Engineering Industry News
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Stay updated with the latest trends, technologies, and opportunities in civil engineering
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {civilIndustryNews.map((news) => (
              <div 
                key={news.id}
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span 
                    style={{ 
                      backgroundColor: getCategoryColor(news.category),
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  >
                    {news.category}
                  </span>
                  <span style={{ color: '#888', fontSize: '0.8rem' }}>{news.date}</span>
                </div>
                <h3 style={{ 
                  margin: '0.5rem 0', 
                  color: '#1a1a1a',
                  fontSize: '1.1rem',
                  lineHeight: '1.4'
                }}>
                  {news.icon} {news.title}
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: '#555',
                  fontSize: '0.9rem',
                  lineHeight: '1.5'
                }}>
                  {news.summary}
                </p>
              </div>
            ))}
          </div>

          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', margin: 0 }}>
              🎯 Join thousands of civil engineers building their careers on Contoso Civil
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
