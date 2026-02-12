import React, { useState, useEffect, useRef } from 'react';
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
  // Student-specific fields
  PhoneNumber?: string;
  StreetAddress?: string;
  City?: string;
  State?: string;
  ZipCode?: string;
  Country?: string;
  UniversityName?: string;
  Specialization?: string;
  GraduationYear?: number;
  CGPA?: number;
  Bio?: string;
  Skills?: string;
}

interface ResumeInfo {
  hasResume: boolean;
  fileName?: string;
  updatedDate?: string;
}

interface StudentEditForm {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  universityName: string;
  specialization: string;
  graduationYear: string;
  cgpa: string;
  bio: string;
  skills: string;
}

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const ProfilePage: React.FC = () => {
  const { userId, firstName, lastName, role, isAuthenticated } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<StudentEditForm>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    universityName: '',
    specialization: '',
    graduationYear: '',
    cgpa: '',
    bio: '',
    skills: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Resume state
  const [resumeInfo, setResumeInfo] = useState<ResumeInfo>({ hasResume: false });
  const [uploadingResume, setUploadingResume] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState(false);

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
        firstName: response.data.FirstName || '',
        lastName: response.data.LastName || '',
        phoneNumber: response.data.PhoneNumber || '',
        streetAddress: response.data.StreetAddress || '',
        city: response.data.City || '',
        state: response.data.State || '',
        zipCode: response.data.ZipCode || '',
        country: response.data.Country || 'United States',
        universityName: response.data.UniversityName || '',
        specialization: response.data.Specialization || '',
        graduationYear: response.data.GraduationYear?.toString() || '',
        cgpa: response.data.CGPA?.toString() || '',
        bio: response.data.Bio || '',
        skills: response.data.Skills || ''
      });
      
      // Fetch resume info if user is a student
      if (response.data.RoleName === 'Student') {
        fetchResumeInfo();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchResumeInfo = async () => {
    try {
      const response = await authService.getResumeInfo(userId!);
      setResumeInfo(response.data);
    } catch (err) {
      console.error('Failed to fetch resume info:', err);
    }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a PDF or Word document.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
      return;
    }

    try {
      setUploadingResume(true);
      setError('');
      await authService.uploadResume(userId!, file);
      setSuccess('Resume uploaded successfully!');
      fetchResumeInfo();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload resume');
    } finally {
      setUploadingResume(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResumeDownload = async () => {
    try {
      setDownloadingResume(true);
      const response = await authService.downloadResume(userId!);
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = resumeInfo.fileName || 'resume';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download resume');
    } finally {
      setDownloadingResume(false);
    }
  };

  const handleResumeDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your resume?')) return;

    try {
      setError('');
      await authService.deleteResume(userId!);
      setResumeInfo({ hasResume: false });
      setSuccess('Resume deleted successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete resume');
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
      const updateData: any = {
        firstName: editForm.firstName,
        lastName: editForm.lastName
      };
      
      // Include student fields if user is a student
      if (profile?.RoleName === 'Student') {
        updateData.phoneNumber = editForm.phoneNumber || null;
        updateData.streetAddress = editForm.streetAddress || null;
        updateData.city = editForm.city || null;
        updateData.state = editForm.state || null;
        updateData.zipCode = editForm.zipCode || null;
        updateData.country = editForm.country || null;
        updateData.universityName = editForm.universityName || null;
        updateData.specialization = editForm.specialization || null;
        updateData.graduationYear = editForm.graduationYear ? parseInt(editForm.graduationYear) : null;
        updateData.cgpa = editForm.cgpa ? parseFloat(editForm.cgpa) : null;
        updateData.bio = editForm.bio || null;
        updateData.skills = editForm.skills || null;
      }
      
      await authService.updateProfile(userId!, updateData);
      
      // Update local state
      dispatch(updateProfile({ firstName: editForm.firstName, lastName: editForm.lastName }));
      setProfile(prev => prev ? { 
        ...prev, 
        FirstName: editForm.firstName, 
        LastName: editForm.lastName,
        PhoneNumber: editForm.phoneNumber,
        StreetAddress: editForm.streetAddress,
        City: editForm.city,
        State: editForm.state,
        ZipCode: editForm.zipCode,
        Country: editForm.country,
        UniversityName: editForm.universityName,
        Specialization: editForm.specialization,
        GraduationYear: editForm.graduationYear ? parseInt(editForm.graduationYear) : undefined,
        CGPA: editForm.cgpa ? parseFloat(editForm.cgpa) : undefined,
        Bio: editForm.bio,
        Skills: editForm.skills
      } : null);
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
      lastName: profile?.LastName || '',
      phoneNumber: profile?.PhoneNumber || '',
      streetAddress: profile?.StreetAddress || '',
      city: profile?.City || '',
      state: profile?.State || '',
      zipCode: profile?.ZipCode || '',
      country: profile?.Country || 'United States',
      universityName: profile?.UniversityName || '',
      specialization: profile?.Specialization || '',
      graduationYear: profile?.GraduationYear?.toString() || '',
      cgpa: profile?.CGPA?.toString() || '',
      bio: profile?.Bio || '',
      skills: profile?.Skills || ''
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

              {/* Student Contact Information - Display Mode */}
              {profile?.RoleName === 'Student' && (
                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>Contact Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Phone Number</label>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{profile?.PhoneNumber || '-'}</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Country</label>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{profile?.Country || '-'}</p>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Street Address</label>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{profile?.StreetAddress || '-'}</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>City</label>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{profile?.City || '-'}</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>State</label>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{profile?.State || '-'}</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>ZIP Code</label>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{profile?.ZipCode || '-'}</p>
                    </div>
                  </div>

                  <h4 style={{ margin: '2rem 0 1rem 0', color: '#333' }}>Education & Skills</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>University</label>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{profile?.UniversityName || '-'}</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Specialization</label>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{profile?.Specialization || '-'}</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Graduation Year</label>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{profile?.GraduationYear || '-'}</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>CGPA</label>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{profile?.CGPA?.toFixed(2) || '-'}</p>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Bio</label>
                      <p style={{ margin: 0, fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' }}>{profile?.Bio || '-'}</p>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Skills</label>
                      <p style={{ margin: 0, fontSize: '1rem', fontWeight: '400' }}>{profile?.Skills || '-'}</p>
                    </div>
                  </div>
                </div>
              )}
              
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

              {/* Student Contact Information - Edit Mode */}
              {profile?.RoleName === 'Student' && (
                <>
                  <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>Contact Information</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Phone Number</label>
                        <input
                          type="tel"
                          value={editForm.phoneNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            let formatted = value;
                            if (value.length >= 6) {
                              formatted = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
                            } else if (value.length >= 3) {
                              formatted = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                            }
                            setEditForm({ ...editForm, phoneNumber: formatted });
                          }}
                          placeholder="(555) 123-4567"
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Country</label>
                        <input
                          type="text"
                          value={editForm.country}
                          onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                          placeholder="United States"
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                        />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Street Address</label>
                        <input
                          type="text"
                          value={editForm.streetAddress}
                          onChange={(e) => setEditForm({ ...editForm, streetAddress: e.target.value })}
                          placeholder="123 Main Street, Apt 4B"
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>City</label>
                        <input
                          type="text"
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          placeholder="New York"
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>State</label>
                        <select
                          value={editForm.state}
                          onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', backgroundColor: 'white' }}
                        >
                          <option value="">Select State</option>
                          {US_STATES.map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>ZIP Code</label>
                        <input
                          type="text"
                          value={editForm.zipCode}
                          onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                          placeholder="10001"
                          maxLength={5}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>Education & Skills</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>University</label>
                        <input
                          type="text"
                          value={editForm.universityName}
                          onChange={(e) => setEditForm({ ...editForm, universityName: e.target.value })}
                          placeholder="University Name"
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Specialization</label>
                        <input
                          type="text"
                          value={editForm.specialization}
                          onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                          placeholder="Civil Engineering"
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Graduation Year</label>
                        <input
                          type="number"
                          value={editForm.graduationYear}
                          onChange={(e) => setEditForm({ ...editForm, graduationYear: e.target.value })}
                          placeholder="2025"
                          min="1950"
                          max="2035"
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>CGPA</label>
                        <input
                          type="number"
                          value={editForm.cgpa}
                          onChange={(e) => setEditForm({ ...editForm, cgpa: e.target.value })}
                          placeholder="3.75"
                          min="0"
                          max="4"
                          step="0.01"
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                        />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Bio</label>
                        <textarea
                          value={editForm.bio}
                          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                          placeholder="Tell us about yourself..."
                          rows={3}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', resize: 'vertical' }}
                        />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Skills</label>
                        <input
                          type="text"
                          value={editForm.skills}
                          onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                          placeholder="AutoCAD, Structural Analysis, Project Management..."
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              
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

      {/* Resume Section - Only for Students */}
      {profile?.RoleName === 'Student' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginTop: '1.5rem', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1976D2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <h3 style={{ margin: 0 }}>Resume</h3>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {resumeInfo.hasResume ? (
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '1rem', 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: '8px',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    backgroundColor: '#e3f2fd', 
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#1976D2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                      <path d="M14 2v6h6"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: '500', wordBreak: 'break-word' }}>{resumeInfo.fileName}</p>
                    {resumeInfo.updatedDate && (
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                        Updated: {new Date(resumeInfo.updatedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleResumeDownload}
                    disabled={downloadingResume}
                    style={{
                      padding: '0.6rem 1.25rem',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: downloadingResume ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      opacity: downloadingResume ? 0.7 : 1
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {downloadingResume ? 'Downloading...' : 'Download'}
                  </button>
                  <label style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: '#1976D2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: uploadingResume ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: uploadingResume ? 0.7 : 1
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    {uploadingResume ? 'Uploading...' : 'Replace'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeUpload}
                      disabled={uploadingResume}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button
                    onClick={handleResumeDelete}
                    style={{
                      padding: '0.6rem 1.25rem',
                      backgroundColor: '#fff',
                      color: '#f44336',
                      border: '1px solid #f44336',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto'
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                </div>
                <p style={{ color: '#666', marginBottom: '1rem' }}>No resume uploaded yet</p>
                <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Upload your resume to help employers learn more about your qualifications. <br/>
                  Accepted formats: PDF, DOC, DOCX (Max 5MB)
                </p>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#1976D2',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: uploadingResume ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  opacity: uploadingResume ? 0.7 : 1
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  {uploadingResume ? 'Uploading...' : 'Upload Resume'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    disabled={uploadingResume}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

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
