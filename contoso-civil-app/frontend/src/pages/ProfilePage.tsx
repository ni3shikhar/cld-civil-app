import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import { updateProfile } from '../slices/authSlice';
import { authService } from '../services/api';

interface UserProfile {
  UserId: number;
  Email: string;
  FirstName: string;
  LastName: string;
  RoleName: string;
  IsActive: boolean;
  CreatedDate: string;
}

const ProfilePage: React.FC = () => {
  const { userId, firstName, lastName, role, isAuthenticated } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [isAuthenticated, userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await authService.getProfile(userId!);
      setProfile(response.data);
      setEditForm({
        firstName: response.data.FirstName,
        lastName: response.data.LastName
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    try {
      setSaving(true);
      await authService.updateProfile(userId!, {
        firstName: editForm.firstName,
        lastName: editForm.lastName
      });
      
      // Update local state
      dispatch(updateProfile({ firstName: editForm.firstName, lastName: editForm.lastName }));
      setProfile(prev => prev ? { ...prev, FirstName: editForm.firstName, LastName: editForm.lastName } : null);
      setSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      firstName: profile?.FirstName || '',
      lastName: profile?.LastName || ''
    });
    setEditing(false);
    setError('');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      setChangingPassword(true);
      await authService.changePassword(userId!, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setSuccess('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePasswordCancel = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordForm(false);
    setError('');
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading profile...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>My Profile</h1>
      
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '8px', marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {/* Profile Header */}
        <div style={{ padding: '2rem', backgroundColor: '#1976D2', color: 'white', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            backgroundColor: '#4CAF50', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 'bold'
          }}>
            {(profile?.FirstName || firstName)?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ margin: 0 }}>{profile?.FirstName || firstName} {profile?.LastName || lastName}</h2>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>{profile?.RoleName || role}</p>
          </div>
        </div>

        {/* Profile Details */}
        <div style={{ padding: '2rem' }}>
          {!editing ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>First Name</label>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{profile?.FirstName}</p>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Last Name</label>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{profile?.LastName}</p>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Email</label>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{profile?.Email}</p>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Role</label>
                  <p style={{ margin: 0 }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '20px', 
                      fontSize: '0.9rem',
                      backgroundColor: profile?.RoleName === 'Administrator' ? '#9C27B0' : profile?.RoleName === 'Employer' ? '#2196F3' : '#4CAF50',
                      color: 'white'
                    }}>
                      {profile?.RoleName}
                    </span>
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Account Status</label>
                  <p style={{ margin: 0 }}>
                    <span style={{ color: profile?.IsActive ? '#4CAF50' : '#f44336', fontWeight: '500' }}>
                      {profile?.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Member Since</label>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>
                    {profile?.CreatedDate ? new Date(profile.CreatedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                  </p>
                </div>
              </div>
              
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setEditing(true)}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    backgroundColor: '#1976D2', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Edit Profile
                </button>
                <button 
                  onClick={() => setShowPasswordForm(true)}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    backgroundColor: '#FF9800', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Change Password
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>First Name *</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Last Name *</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Email</label>
                  <input
                    type="email"
                    value={profile?.Email || ''}
                    disabled
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #eee', fontSize: '1rem', backgroundColor: '#f5f5f5', color: '#666' }}
                  />
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#999' }}>Email cannot be changed</p>
                </div>
              </div>
              
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee', display: 'flex', gap: '1rem' }}>
                <button 
                  type="submit"
                  disabled={saving}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    backgroundColor: '#4CAF50', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    backgroundColor: '#f5f5f5', 
                    color: '#333', 
                    border: '1px solid #ccc', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '450px', width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Change Password</h2>
            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Current Password *</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>New Password *</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength={6}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
                />
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#999' }}>Minimum 6 characters</p>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Confirm New Password *</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={handlePasswordCancel}
                  disabled={changingPassword}
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={changingPassword}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    backgroundColor: '#FF9800', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: changingPassword ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    opacity: changingPassword ? 0.7 : 1
                  }}
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
