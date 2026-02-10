import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../hooks';
import { questionService, jobService, userService } from '../services/api';

interface Question {
  QuestionId: number;
  CivilDomain: string;
  QuestionCategory: string;
  QuestionText: string;
  CorrectAnswer: string;
  Explanation: string;
  DifficultyLevel: string;
  IsActive: boolean;
  CreatedDate: string;
  CreatedByName: string;
}

interface Job {
  JobId: number;
  JobTitle: string;
  CompanyName: string;
  EmployerName: string;
  CivilDomain: string;
  JobLocation: string;
  Salary: number;
  ApprovalStatus: string;
  IsActive: boolean;
  PostingDate: string;
  ApplicationCount: number;
}

interface User {
  UserId: number;
  Email: string;
  FirstName: string;
  LastName: string;
  RoleName: string;
  RoleId: number;
  IsActive: boolean;
  CreatedDate: string;
}

interface QuestionSummary {
  CivilDomain: string;
  TotalQuestions: number;
  ActiveQuestions: number;
  EasyCount: number;
  MediumCount: number;
  HardCount: number;
}

interface JobSummary {
  TotalJobs: number;
  PendingCount: number;
  ApprovedCount: number;
  RejectedCount: number;
  ActiveCount: number;
}

interface LocationSummary {
  JobLocation: string;
  JobCount: number;
  ApprovedCount: number;
  PendingCount: number;
}

interface UserSummary {
  TotalUsers: number;
  StudentCount: number;
  EmployerCount: number;
  AdminCount: number;
  ActiveUsers: number;
}

const AdminDashboard: React.FC = () => {
  const { userId } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'jobs' | 'users'>('overview');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [questionSummary, setQuestionSummary] = useState<QuestionSummary[]>([]);
  const [jobSummary, setJobSummary] = useState<JobSummary | null>(null);
  const [locationSummary, setLocationSummary] = useState<LocationSummary[]>([]);
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Filter states
  const [questionFilter, setQuestionFilter] = useState({ search: '', domain: '', difficulty: '', status: '' });
  const [jobFilter, setJobFilter] = useState({ search: '', domain: '', status: '' });
  const [userFilter, setUserFilter] = useState({ search: '', role: '', status: '' });

  const [newQuestion, setNewQuestion] = useState({
    civilDomain: 'Structural',
    questionCategory: 'Technical',
    questionText: '',
    correctAnswer: '',
    explanation: '',
    difficultyLevel: 'Medium'
  });

  const civilDomains = ['Structural', 'Geotechnical', 'Transportation', 'Water Resources', 'Environmental', 'Construction Management'];
  const difficultyLevels = ['Easy', 'Medium', 'Hard'];
  const roles = ['Student', 'Employer', 'Administrator'];
  const approvalStatuses = ['Pending', 'Approved', 'Rejected'];

  // Filtered data
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = !questionFilter.search || 
      q.QuestionText?.toLowerCase().includes(questionFilter.search.toLowerCase()) ||
      q.CorrectAnswer?.toLowerCase().includes(questionFilter.search.toLowerCase());
    const matchesDomain = !questionFilter.domain || q.CivilDomain === questionFilter.domain;
    const matchesDifficulty = !questionFilter.difficulty || q.DifficultyLevel === questionFilter.difficulty;
    const matchesStatus = !questionFilter.status || 
      (questionFilter.status === 'Active' ? q.IsActive : !q.IsActive);
    return matchesSearch && matchesDomain && matchesDifficulty && matchesStatus;
  });

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = !jobFilter.search || 
      j.JobTitle?.toLowerCase().includes(jobFilter.search.toLowerCase()) ||
      j.CompanyName?.toLowerCase().includes(jobFilter.search.toLowerCase()) ||
      j.JobLocation?.toLowerCase().includes(jobFilter.search.toLowerCase());
    const matchesDomain = !jobFilter.domain || j.CivilDomain === jobFilter.domain;
    const matchesStatus = !jobFilter.status || j.ApprovalStatus === jobFilter.status;
    return matchesSearch && matchesDomain && matchesStatus;
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch = !userFilter.search || 
      u.Email?.toLowerCase().includes(userFilter.search.toLowerCase()) ||
      u.FirstName?.toLowerCase().includes(userFilter.search.toLowerCase()) ||
      u.LastName?.toLowerCase().includes(userFilter.search.toLowerCase());
    const matchesRole = !userFilter.role || u.RoleName === userFilter.role;
    const matchesStatus = !userFilter.status || 
      (userFilter.status === 'Active' ? u.IsActive : !u.IsActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [qRes, qSumRes, jRes, jSumRes, jLocRes, uRes, uSumRes] = await Promise.all([
        questionService.getAllQuestions(),
        questionService.getQuestionSummary(),
        jobService.getAllJobs(),
        jobService.getJobSummary(),
        jobService.getTopLocations(),
        userService.getAllUsers(),
        userService.getUserSummary()
      ]);
      setQuestions(qRes.data);
      setQuestionSummary(qSumRes.data);
      setJobs(jRes.data);
      setJobSummary(jSumRes.data);
      setLocationSummary(jLocRes.data);
      setUsers(uRes.data);
      setUserSummary(uSumRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await questionService.createQuestion({ ...newQuestion, createdBy: userId });
      setSuccess('Question created successfully!');
      setShowQuestionModal(false);
      setNewQuestion({ civilDomain: 'Structural', questionCategory: 'Technical', questionText: '', correctAnswer: '', explanation: '', difficultyLevel: 'Medium' });
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create question');
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setError('');
    try {
      await questionService.updateQuestion(editingQuestion.QuestionId.toString(), {
        civilDomain: editingQuestion.CivilDomain,
        questionCategory: editingQuestion.QuestionCategory,
        questionText: editingQuestion.QuestionText,
        correctAnswer: editingQuestion.CorrectAnswer,
        explanation: editingQuestion.Explanation,
        difficultyLevel: editingQuestion.DifficultyLevel,
        isActive: editingQuestion.IsActive
      });
      setSuccess('Question updated successfully!');
      setEditingQuestion(null);
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update question');
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await questionService.deleteQuestion(id.toString());
      setSuccess('Question deleted successfully!');
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete question');
    }
  };

  const handleJobApproval = async (jobId: number, status: string) => {
    try {
      await jobService.updateJobApproval(jobId.toString(), status);
      setSuccess(`Job ${status.toLowerCase()} successfully!`);
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update job status');
    }
  };

  const handleUserUpdate = async (user: User, isActive: boolean) => {
    try {
      await userService.updateUser(user.UserId.toString(), {
        firstName: user.FirstName,
        lastName: user.LastName,
        roleId: user.RoleId,
        isActive
      });
      setSuccess('User updated successfully!');
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await userService.deleteUser(id.toString());
      setSuccess('User deactivated successfully!');
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to deactivate user');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return '#FF9800';
      case 'Approved': return '#4CAF50';
      case 'Rejected': return '#f44336';
      default: return '#757575';
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>Administrator Dashboard</h1>
      
      {error && <p style={{ color: 'red', padding: '0.5rem', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</p>}
      {success && <p style={{ color: 'green', padding: '0.5rem', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>{success}</p>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #eee', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {['overview', 'questions', 'jobs', 'users'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: activeTab === tab ? '#1976D2' : '#f5f5f5', color: activeTab === tab ? 'white' : 'black', border: 'none', borderRadius: '4px', textTransform: 'capitalize' }}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <h2>Platform Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1.5rem', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#1565C0' }}>Users</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0' }}>{userSummary?.TotalUsers || 0}</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                Students: {userSummary?.StudentCount || 0} | Employers: {userSummary?.EmployerCount || 0} | Admins: {userSummary?.AdminCount || 0}
              </p>
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#E65100' }}>Job Requisitions</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0' }}>{jobSummary?.TotalJobs || 0}</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                Pending: {jobSummary?.PendingCount || 0} | Approved: {jobSummary?.ApprovedCount || 0} | Rejected: {jobSummary?.RejectedCount || 0}
              </p>
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#2E7D32' }}>Interview Questions</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0' }}>{questionSummary.reduce((a, b) => a + b.TotalQuestions, 0)}</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                Active: {questionSummary.reduce((a, b) => a + b.ActiveQuestions, 0)} across {questionSummary.length} domains
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <h3>Top 5 Job Locations</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Location</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Approved</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {locationSummary.length > 0 ? locationSummary.map((loc, idx) => (
                    <tr key={loc.JobLocation}>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                        <span style={{ marginRight: '0.5rem', color: idx < 3 ? '#E65100' : '#666' }}>#{idx + 1}</span>
                        {loc.JobLocation}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>{loc.JobCount}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee', color: '#4CAF50' }}>{loc.ApprovedCount}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee', color: '#FF9800' }}>{loc.PendingCount}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>No job locations yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h3>Questions by Domain</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Domain</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Active</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Easy</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Medium</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Hard</th>
                  </tr>
                </thead>
                <tbody>
                  {questionSummary.map(q => (
                    <tr key={q.CivilDomain}>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{q.CivilDomain}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>{q.TotalQuestions}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>{q.ActiveQuestions}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee', color: '#4CAF50' }}>{q.EasyCount}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee', color: '#FF9800' }}>{q.MediumCount}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee', color: '#f44336' }}>{q.HardCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Interview Questions Management</h2>
            <button onClick={() => setShowQuestionModal(true)} style={{ padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              + Add Question
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <input type="text" placeholder="Search questions..." value={questionFilter.search} onChange={(e) => setQuestionFilter({ ...questionFilter, search: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px', flex: 1 }} />
            <select value={questionFilter.domain} onChange={(e) => setQuestionFilter({ ...questionFilter, domain: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">All Domains</option>
              {civilDomains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={questionFilter.difficulty} onChange={(e) => setQuestionFilter({ ...questionFilter, difficulty: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">All Difficulties</option>
              {difficultyLevels.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={questionFilter.status} onChange={(e) => setQuestionFilter({ ...questionFilter, status: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            {(questionFilter.search || questionFilter.domain || questionFilter.difficulty || questionFilter.status) && (
              <button onClick={() => setQuestionFilter({ search: '', domain: '', difficulty: '', status: '' })} style={{ padding: '0.5rem 1rem', backgroundColor: '#757575', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>
            )}
          </div>
          <p style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>Showing {filteredQuestions.length} of {questions.length} questions</p>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Question</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Domain</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Difficulty</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map(q => (
                <tr key={q.QuestionId}>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', maxWidth: '400px' }}>{q.QuestionText?.substring(0, 100)}...</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{q.CivilDomain}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: q.DifficultyLevel === 'Easy' ? '#e8f5e9' : q.DifficultyLevel === 'Medium' ? '#fff3e0' : '#ffebee', color: q.DifficultyLevel === 'Easy' ? '#2E7D32' : q.DifficultyLevel === 'Medium' ? '#E65100' : '#C62828' }}>
                      {q.DifficultyLevel}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <span style={{ color: q.IsActive ? '#4CAF50' : '#f44336' }}>{q.IsActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <button onClick={() => setEditingQuestion(q)} style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDeleteQuestion(q.QuestionId)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div>
          <h2>Job Requisitions Management</h2>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <input type="text" placeholder="Search jobs, companies, locations..." value={jobFilter.search} onChange={(e) => setJobFilter({ ...jobFilter, search: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px', flex: 1 }} />
            <select value={jobFilter.domain} onChange={(e) => setJobFilter({ ...jobFilter, domain: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">All Domains</option>
              {civilDomains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={jobFilter.status} onChange={(e) => setJobFilter({ ...jobFilter, status: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">All Status</option>
              {approvalStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(jobFilter.search || jobFilter.domain || jobFilter.status) && (
              <button onClick={() => setJobFilter({ search: '', domain: '', status: '' })} style={{ padding: '0.5rem 1rem', backgroundColor: '#757575', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>
            )}
          </div>
          <p style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>Showing {filteredJobs.length} of {jobs.length} jobs</p>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Job Title</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Company</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Domain</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Apps</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map(j => (
                <tr key={j.JobId}>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{j.JobTitle}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{j.CompanyName}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{j.CivilDomain}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>{j.ApplicationCount}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: getStatusColor(j.ApprovalStatus), color: 'white' }}>
                      {j.ApprovalStatus}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    {j.ApprovalStatus === 'Pending' && (
                      <>
                        <button onClick={() => handleJobApproval(j.JobId, 'Approved')} style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Approve</button>
                        <button onClick={() => handleJobApproval(j.JobId, 'Rejected')} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                      </>
                    )}
                    {j.ApprovalStatus !== 'Pending' && (
                      <select value={j.ApprovalStatus} onChange={(e) => handleJobApproval(j.JobId, e.target.value)} style={{ padding: '0.25rem', borderRadius: '4px' }}>
                        <option value="Approved">Approved</option>
                        <option value="Pending">Pending</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <h2>User Management</h2>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <input type="text" placeholder="Search name or email..." value={userFilter.search} onChange={(e) => setUserFilter({ ...userFilter, search: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px', flex: 1 }} />
            <select value={userFilter.role} onChange={(e) => setUserFilter({ ...userFilter, role: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">All Roles</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={userFilter.status} onChange={(e) => setUserFilter({ ...userFilter, status: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            {(userFilter.search || userFilter.role || userFilter.status) && (
              <button onClick={() => setUserFilter({ search: '', role: '', status: '' })} style={{ padding: '0.5rem 1rem', backgroundColor: '#757575', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>
            )}
          </div>
          <p style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>Showing {filteredUsers.length} of {users.length} users</p>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Name</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Email</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Role</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Joined</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.UserId}>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{u.FirstName} {u.LastName}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{u.Email}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: u.RoleName === 'Administrator' ? '#9C27B0' : u.RoleName === 'Employer' ? '#2196F3' : '#4CAF50', color: 'white' }}>
                      {u.RoleName}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <span style={{ color: u.IsActive ? '#4CAF50' : '#f44336' }}>{u.IsActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>{new Date(u.CreatedDate).toLocaleDateString()}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    {u.IsActive ? (
                      <button onClick={() => handleDeleteUser(u.UserId)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Deactivate</button>
                    ) : (
                      <button onClick={() => handleUserUpdate(u, true)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Activate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Question Modal */}
      {showQuestionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <h2>Add New Question</h2>
            <form onSubmit={handleCreateQuestion}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Civil Domain</label>
                <select value={newQuestion.civilDomain} onChange={(e) => setNewQuestion({ ...newQuestion, civilDomain: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                  {civilDomains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Difficulty Level</label>
                <select value={newQuestion.difficultyLevel} onChange={(e) => setNewQuestion({ ...newQuestion, difficultyLevel: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                  {difficultyLevels.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Question Text *</label>
                <textarea value={newQuestion.questionText} onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })} required rows={3} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Correct Answer *</label>
                <textarea value={newQuestion.correctAnswer} onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })} required rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Explanation</label>
                <textarea value={newQuestion.explanation} onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowQuestionModal(false)} style={{ padding: '0.5rem 1rem', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Create Question</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <h2>Edit Question</h2>
            <form onSubmit={handleUpdateQuestion}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Civil Domain</label>
                <select value={editingQuestion.CivilDomain} onChange={(e) => setEditingQuestion({ ...editingQuestion, CivilDomain: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                  {civilDomains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Difficulty Level</label>
                <select value={editingQuestion.DifficultyLevel} onChange={(e) => setEditingQuestion({ ...editingQuestion, DifficultyLevel: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                  {difficultyLevels.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Question Text *</label>
                <textarea value={editingQuestion.QuestionText} onChange={(e) => setEditingQuestion({ ...editingQuestion, QuestionText: e.target.value })} required rows={3} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Correct Answer *</label>
                <textarea value={editingQuestion.CorrectAnswer} onChange={(e) => setEditingQuestion({ ...editingQuestion, CorrectAnswer: e.target.value })} required rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Explanation</label>
                <textarea value={editingQuestion.Explanation || ''} onChange={(e) => setEditingQuestion({ ...editingQuestion, Explanation: e.target.value })} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={editingQuestion.IsActive} onChange={(e) => setEditingQuestion({ ...editingQuestion, IsActive: e.target.checked })} />
                  Active
                </label>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingQuestion(null)} style={{ padding: '0.5rem 1rem', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Update Question</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
