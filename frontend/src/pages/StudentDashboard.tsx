import React, { useEffect, useState } from 'react';
import { jobService, applicationService, questionService } from '../services/api';

interface Job {
  JobId: number;
  JobTitle: string;
  JobDescription: string;
  CivilDomain: string;
  Salary: number;
  JobLocation: string;
  JobType: string;
  RequiredSkills: string;
  RequiredExperience: number;
  CompanyName: string;
  NumberOfOpenings: number;
}

interface Application {
  ApplicationId: number;
  JobId: number;
  JobTitle: string;
  CompanyName: string;
  JobLocation: string;
  CivilDomain: string;
  ApplicationStatus: string;
  AppliedDate: string;
}

interface Question {
  QuestionId: number;
  CivilDomain: string;
  QuestionCategory: string;
  QuestionText: string;
  CorrectAnswer: string;
  Explanation: string;
  DifficultyLevel: string;
  IsActive: boolean;
}

const StudentDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications' | 'questions'>('jobs');
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);

  // Filter states
  const [jobFilter, setJobFilter] = useState({ search: '', domain: '', jobType: '', location: '' });
  const [appFilter, setAppFilter] = useState({ search: '', status: '' });
  const [questionFilter, setQuestionFilter] = useState({ search: '', domain: '', difficulty: '' });

  const civilDomains = ['Structural', 'Geotechnical', 'Transportation', 'Water Resources', 'Environmental', 'Construction Management'];
  const jobTypes = ['Full-Time', 'Part-Time', 'Contract', 'Internship'];
  const applicationStatuses = ['Submitted', 'Under Review', 'Shortlisted', 'Rejected', 'Accepted'];
  const difficultyLevels = ['Easy', 'Medium', 'Hard'];

  useEffect(() => {
    loadJobs();
    loadApplications();
    loadQuestions();
  }, []);

  const loadJobs = async () => {
    try {
      const response = await jobService.getJobs();
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const loadApplications = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (userId) {
        const response = await applicationService.getUserApplications(userId);
        setApplications(response.data);
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
    }
  };

  const loadQuestions = async () => {
    try {
      const response = await questionService.getQuestions();
      setQuestions(response.data);
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  };

  // Filtered data
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !jobFilter.search || 
      job.JobTitle?.toLowerCase().includes(jobFilter.search.toLowerCase()) ||
      job.CompanyName?.toLowerCase().includes(jobFilter.search.toLowerCase()) ||
      job.JobDescription?.toLowerCase().includes(jobFilter.search.toLowerCase()) ||
      job.RequiredSkills?.toLowerCase().includes(jobFilter.search.toLowerCase());
    const matchesDomain = !jobFilter.domain || job.CivilDomain === jobFilter.domain;
    const matchesType = !jobFilter.jobType || job.JobType === jobFilter.jobType;
    const matchesLocation = !jobFilter.location || 
      job.JobLocation?.toLowerCase().includes(jobFilter.location.toLowerCase());
    return matchesSearch && matchesDomain && matchesType && matchesLocation;
  });

  const filteredApplications = applications.filter(app => {
    const matchesSearch = !appFilter.search || 
      app.JobTitle?.toLowerCase().includes(appFilter.search.toLowerCase()) ||
      app.CompanyName?.toLowerCase().includes(appFilter.search.toLowerCase());
    const matchesStatus = !appFilter.status || app.ApplicationStatus === appFilter.status;
    return matchesSearch && matchesStatus;
  });

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = !questionFilter.search || 
      q.QuestionText?.toLowerCase().includes(questionFilter.search.toLowerCase()) ||
      q.CorrectAnswer?.toLowerCase().includes(questionFilter.search.toLowerCase());
    const matchesDomain = !questionFilter.domain || q.CivilDomain === questionFilter.domain;
    const matchesDifficulty = !questionFilter.difficulty || q.DifficultyLevel === questionFilter.difficulty;
    return matchesSearch && matchesDomain && matchesDifficulty;
  });

  // Get unique locations from jobs for filter dropdown
  const uniqueLocations = Array.from(new Set(jobs.map(j => j.JobLocation).filter(Boolean)));

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'Easy': return { bg: '#e8f5e9', color: '#2E7D32' };
      case 'Medium': return { bg: '#fff3e0', color: '#E65100' };
      case 'Hard': return { bg: '#ffebee', color: '#C62828' };
      default: return { bg: '#f5f5f5', color: '#666' };
    }
  };

  const handleApply = (job: Job) => {
    setSelectedJob(job);
    setCoverLetter('');
    setShowApplyModal(true);
    setMessage('');
  };

  const submitApplication = async () => {
    if (!selectedJob) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      const userId = localStorage.getItem('userId');
      await applicationService.submitApplication({
        jobId: selectedJob.JobId,
        userId: parseInt(userId || '0'),
        coverLetter
      });
      setMessage('Application submitted successfully!');
      setShowApplyModal(false);
      loadApplications();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const hasApplied = (jobId: number) => {
    return applications.some(app => app.JobId === jobId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted': return '#2196F3';
      case 'Under Review': return '#FF9800';
      case 'Shortlisted': return '#4CAF50';
      case 'Rejected': return '#f44336';
      case 'Accepted': return '#4CAF50';
      default: return '#757575';
    }
  };

  return (
    <div className="dashboard-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Student Dashboard</h1>
      
      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        <button 
          onClick={() => setActiveTab('jobs')}
          style={{ 
            padding: '0.75rem 1.5rem', 
            cursor: 'pointer',
            background: activeTab === 'jobs' ? '#1976d2' : '#fff',
            color: activeTab === 'jobs' ? '#fff' : '#333',
            border: '1px solid #1976d2',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          Available Jobs ({jobs.length})
        </button>
        <button 
          onClick={() => setActiveTab('applications')}
          style={{ 
            padding: '0.75rem 1.5rem', 
            cursor: 'pointer',
            background: activeTab === 'applications' ? '#1976d2' : '#fff',
            color: activeTab === 'applications' ? '#fff' : '#333',
            border: '1px solid #1976d2',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          My Applications ({applications.length})
        </button>
        <button 
          onClick={() => setActiveTab('questions')}
          style={{ 
            padding: '0.75rem 1.5rem', 
            cursor: 'pointer',
            background: activeTab === 'questions' ? '#4CAF50' : '#fff',
            color: activeTab === 'questions' ? '#fff' : '#333',
            border: '1px solid #4CAF50',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          Interview Questions ({questions.length})
        </button>
      </div>

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div>
          {/* Jobs Filter */}
          <div className="filter-section">
            <input 
              type="text" 
              placeholder="Search jobs, companies, skills..." 
              value={jobFilter.search} 
              onChange={(e) => setJobFilter({ ...jobFilter, search: e.target.value })} 
              className="filter-input"
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} 
            />
            <select 
              value={jobFilter.domain} 
              onChange={(e) => setJobFilter({ ...jobFilter, domain: e.target.value })} 
              className="filter-select"
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">All Domains</option>
              {civilDomains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select 
              value={jobFilter.jobType} 
              onChange={(e) => setJobFilter({ ...jobFilter, jobType: e.target.value })} 
              className="filter-select"
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">All Job Types</option>
              {jobTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select 
              value={jobFilter.location} 
              onChange={(e) => setJobFilter({ ...jobFilter, location: e.target.value })} 
              className="filter-select"
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">All Locations</option>
              {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {(jobFilter.search || jobFilter.domain || jobFilter.jobType || jobFilter.location) && (
              <button 
                onClick={() => setJobFilter({ search: '', domain: '', jobType: '', location: '' })} 
                style={{ padding: '0.5rem 1rem', backgroundColor: '#757575', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>
          <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>Showing {filteredJobs.length} of {jobs.length} jobs</p>

          {filteredJobs.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>No jobs match your filters.</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {filteredJobs.map((job) => (
                <div key={job.JobId} style={{ 
                  border: '1px solid #ddd', 
                  padding: '1.5rem', 
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>{job.JobTitle}</h3>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontWeight: '500' }}>{job.CompanyName}</p>
                    </div>
                    <span style={{ 
                      background: '#e3f2fd', 
                      color: '#1976d2', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      {job.JobType}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', margin: '1rem 0', fontSize: '0.9rem' }}>
                    <span>📍 {job.JobLocation}</span>
                    <span>🏗️ {job.CivilDomain}</span>
                    <span>💰 ${job.Salary?.toLocaleString() || 'Competitive'}{job.JobType === 'Internship' ? '/hr' : '/year'}</span>
                    <span>📋 {job.RequiredExperience}+ years exp</span>
                    <span>👥 {job.NumberOfOpenings} opening{job.NumberOfOpenings > 1 ? 's' : ''}</span>
                  </div>
                  
                  <p style={{ margin: '0.5rem 0', color: '#444', lineHeight: '1.5' }}>
                    {job.JobDescription?.substring(0, 200)}...
                  </p>
                  
                  <div style={{ margin: '1rem 0' }}>
                    <strong style={{ fontSize: '0.875rem' }}>Skills:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {job.RequiredSkills?.split(',').slice(0, 5).map((skill, idx) => (
                        <span key={idx} style={{ 
                          background: '#f5f5f5', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '4px',
                          fontSize: '0.8rem'
                        }}>
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                    {hasApplied(job.JobId) ? (
                      <span style={{ 
                        color: '#4CAF50', 
                        fontWeight: 'bold',
                        padding: '0.5rem 1rem',
                        border: '1px solid #4CAF50',
                        borderRadius: '4px'
                      }}>
                        ✓ Applied
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleApply(job)}
                        style={{ 
                          padding: '0.5rem 1.5rem', 
                          cursor: 'pointer',
                          backgroundColor: '#1976d2',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <div>
          {/* Applications Filter */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <input 
              type="text" 
              placeholder="Search jobs or companies..." 
              value={appFilter.search} 
              onChange={(e) => setAppFilter({ ...appFilter, search: e.target.value })} 
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px', flex: 1 }} 
            />
            <select 
              value={appFilter.status} 
              onChange={(e) => setAppFilter({ ...appFilter, status: e.target.value })} 
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">All Statuses</option>
              {applicationStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(appFilter.search || appFilter.status) && (
              <button 
                onClick={() => setAppFilter({ search: '', status: '' })} 
                style={{ padding: '0.5rem 1rem', backgroundColor: '#757575', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>
          <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>Showing {filteredApplications.length} of {applications.length} applications</p>

          {filteredApplications.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
              {applications.length === 0 ? "You haven't applied to any jobs yet." : "No applications match your filters."}
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {filteredApplications.map((app) => (
                <div key={app.ApplicationId} style={{ 
                  border: '1px solid #ddd', 
                  padding: '1.5rem', 
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0' }}>{app.JobTitle}</h3>
                      <p style={{ margin: '0', color: '#666' }}>{app.CompanyName}</p>
                    </div>
                    <span style={{ 
                      background: getStatusColor(app.ApplicationStatus) + '20',
                      color: getStatusColor(app.ApplicationStatus),
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '0.875rem'
                    }}>
                      {app.ApplicationStatus}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                    <span>📍 {app.JobLocation}</span>
                    <span>🏗️ {app.CivilDomain}</span>
                    <span>📅 Applied: {new Date(app.AppliedDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && selectedJob && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 1rem 0' }}>Apply for {selectedJob.JobTitle}</h2>
            <p style={{ color: '#666', marginBottom: '1rem' }}>{selectedJob.CompanyName}</p>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Cover Letter (Optional)
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Write a brief cover letter explaining why you're a great fit for this position..."
                style={{
                  width: '100%',
                  minHeight: '150px',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  resize: 'vertical'
                }}
              />
            </div>

            {message && (
              <p style={{ 
                color: message.includes('success') ? 'green' : 'red',
                marginBottom: '1rem'
              }}>
                {message}
              </p>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowApplyModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitApplication}
                disabled={loading}
                style={{
                  padding: '0.5rem 1.5rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  backgroundColor: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Questions Tab */}
      {activeTab === 'questions' && (
        <div>
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
            <p style={{ margin: 0, color: '#2E7D32' }}>
              📚 Practice with these interview questions to prepare for your civil engineering career!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <input 
              type="text" 
              placeholder="Search questions..." 
              value={questionFilter.search} 
              onChange={(e) => setQuestionFilter({ ...questionFilter, search: e.target.value })} 
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px', flex: 1 }} 
            />
            <select 
              value={questionFilter.domain} 
              onChange={(e) => setQuestionFilter({ ...questionFilter, domain: e.target.value })}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">All Domains</option>
              {civilDomains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select 
              value={questionFilter.difficulty} 
              onChange={(e) => setQuestionFilter({ ...questionFilter, difficulty: e.target.value })}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">All Difficulties</option>
              {difficultyLevels.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {(questionFilter.search || questionFilter.domain || questionFilter.difficulty) && (
              <button 
                onClick={() => setQuestionFilter({ search: '', domain: '', difficulty: '' })} 
                style={{ padding: '0.5rem 1rem', backgroundColor: '#757575', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>
          <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>Showing {filteredQuestions.length} of {questions.length} questions</p>

          {filteredQuestions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>No questions available for the selected filter.</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {filteredQuestions.map((q, index) => (
                <div 
                  key={q.QuestionId} 
                  style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: '8px', 
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    overflow: 'hidden'
                  }}
                >
                  <div 
                    onClick={() => setExpandedQuestionId(expandedQuestionId === q.QuestionId ? null : q.QuestionId)}
                    style={{ 
                      padding: '1rem 1.5rem', 
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      backgroundColor: expandedQuestionId === q.QuestionId ? '#f5f5f5' : 'white'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem',
                          backgroundColor: '#e3f2fd',
                          color: '#1565C0'
                        }}>
                          {q.CivilDomain}
                        </span>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem',
                          backgroundColor: getDifficultyColor(q.DifficultyLevel).bg,
                          color: getDifficultyColor(q.DifficultyLevel).color
                        }}>
                          {q.DifficultyLevel}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontWeight: '500', color: '#333' }}>
                        <span style={{ color: '#1976d2', marginRight: '0.5rem' }}>Q{index + 1}.</span>
                        {q.QuestionText}
                      </p>
                    </div>
                    <span style={{ color: '#666', fontSize: '1.2rem' }}>
                      {expandedQuestionId === q.QuestionId ? '▲' : '▼'}
                    </span>
                  </div>
                  
                  {expandedQuestionId === q.QuestionId && (
                    <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #eee', backgroundColor: '#fafafa' }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#666', fontWeight: '500' }}>Answer:</p>
                        <p style={{ margin: 0, color: '#2E7D32', backgroundColor: '#e8f5e9', padding: '0.75rem', borderRadius: '4px' }}>
                          {q.CorrectAnswer}
                        </p>
                      </div>
                      {q.Explanation && (
                        <div>
                          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#666', fontWeight: '500' }}>Explanation:</p>
                          <p style={{ margin: 0, color: '#555', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #eee' }}>
                            {q.Explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
