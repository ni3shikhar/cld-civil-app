import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../hooks';
import { jobService, applicationService } from '../services/api';

interface Job {
  JobId: number;
  JobTitle: string;
  JobDescription: string;
  RequiredSkills: string;
  CivilDomain: string;
  Salary: number;
  JobLocation: string;
  PostingDate: string;
  IsActive: boolean;
  ApprovalStatus: string;
  ApplicationCount: number;
}

interface Application {
  ApplicationId: number;
  JobId: number;
  JobTitle: string;
  JobLocation: string;
  CivilDomain: string;
  FirstName: string;
  LastName: string;
  Email: string;
  University: string;
  GraduationYear: number;
  GPA: number;
  Skills: string;
  CoverLetter: string;
  Status: string;
  AppliedDate: string;
}

const EmployerDashboard: React.FC = () => {
  const { userId } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications' | 'post'>('jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New job form state
  const [newJob, setNewJob] = useState({
    jobTitle: '',
    jobDescription: '',
    requiredSkills: '',
    civilDomain: 'Structural',
    salary: '',
    jobLocation: ''
  });

  const civilDomains = ['Structural', 'Geotechnical', 'Transportation', 'Water Resources', 'Environmental', 'Construction Management'];

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [jobsRes, appsRes] = await Promise.all([
        jobService.getEmployerJobs(userId!.toString()),
        applicationService.getEmployerApplications(userId!.toString())
      ]);
      setJobs(jobsRes.data);
      setApplications(appsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await jobService.createJob({
        userId,
        ...newJob,
        salary: parseFloat(newJob.salary) || 0
      });
      setSuccess('Job posted successfully!');
      setNewJob({ jobTitle: '', jobDescription: '', requiredSkills: '', civilDomain: 'Structural', salary: '', jobLocation: '' });
      fetchData();
      setTimeout(() => setActiveTab('jobs'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to post job');
    }
  };

  const handleStatusUpdate = async (applicationId: number, status: string) => {
    try {
      await applicationService.updateApplicationStatus(applicationId.toString(), status);
      setApplications(apps => apps.map(app => 
        app.ApplicationId === applicationId ? { ...app, Status: status } : app
      ));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted': return '#2196F3';
      case 'Under Review': return '#FF9800';
      case 'Shortlisted': return '#4CAF50';
      case 'Rejected': return '#f44336';
      case 'Accepted': return '#8BC34A';
      default: return '#757575';
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Employer Dashboard</h1>
      
      {error && <p style={{ color: 'red', padding: '0.5rem', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</p>}
      {success && <p style={{ color: 'green', padding: '0.5rem', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>{success}</p>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #eee', paddingBottom: '0.5rem' }}>
        <button onClick={() => setActiveTab('jobs')} style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: activeTab === 'jobs' ? '#1976D2' : '#f5f5f5', color: activeTab === 'jobs' ? 'white' : 'black', border: 'none', borderRadius: '4px' }}>
          My Jobs ({jobs.length})
        </button>
        <button onClick={() => setActiveTab('applications')} style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: activeTab === 'applications' ? '#1976D2' : '#f5f5f5', color: activeTab === 'applications' ? 'white' : 'black', border: 'none', borderRadius: '4px' }}>
          Applications ({applications.length})
        </button>
        <button onClick={() => setActiveTab('post')} style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: activeTab === 'post' ? '#4CAF50' : '#f5f5f5', color: activeTab === 'post' ? 'white' : 'black', border: 'none', borderRadius: '4px' }}>
          + Post New Job
        </button>
      </div>

      {activeTab === 'jobs' && (
        <div>
          <h2>My Job Postings</h2>
          {jobs.length === 0 ? (
            <p>No jobs posted yet. <span style={{ color: '#1976D2', cursor: 'pointer' }} onClick={() => setActiveTab('post')}>Post your first job!</span></p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {jobs.map(job => (
                <div key={job.JobId} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0' }}>{job.JobTitle}</h3>
                      <p style={{ margin: '0.25rem 0', color: '#666' }}><strong>Domain:</strong> {job.CivilDomain} | <strong>Location:</strong> {job.JobLocation}</p>
                      <p style={{ margin: '0.25rem 0', color: '#666' }}><strong>Salary:</strong> ${job.Salary?.toLocaleString() || 'Not specified'}</p>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>{job.JobDescription?.substring(0, 150)}...</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ backgroundColor: job.IsActive ? '#4CAF50' : '#f44336', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {job.ApprovalStatus}
                      </span>
                      <p style={{ margin: '0.5rem 0', fontWeight: 'bold', color: '#1976D2' }}>{job.ApplicationCount} Applications</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'applications' && (
        <div>
          <h2>Applications Received</h2>
          {applications.length === 0 ? (
            <p>No applications received yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {applications.map(app => (
                <div key={app.ApplicationId} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: '1', minWidth: '250px' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0' }}>{app.FirstName} {app.LastName}</h3>
                      <p style={{ margin: '0.25rem 0', color: '#666' }}><strong>Email:</strong> {app.Email}</p>
                      <p style={{ margin: '0.25rem 0', color: '#666' }}><strong>Applied for:</strong> {app.JobTitle}</p>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}><strong>Applied:</strong> {new Date(app.AppliedDate).toLocaleDateString()}</p>
                    </div>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <p style={{ margin: '0.25rem 0' }}><strong>University:</strong> {app.University || 'Not specified'}</p>
                      <p style={{ margin: '0.25rem 0' }}><strong>Graduation:</strong> {app.GraduationYear || 'Not specified'}</p>
                      <p style={{ margin: '0.25rem 0' }}><strong>GPA:</strong> {app.GPA || 'Not specified'}</p>
                      <p style={{ margin: '0.25rem 0' }}><strong>Skills:</strong> {app.Skills || 'Not specified'}</p>
                    </div>
                    <div style={{ minWidth: '150px', textAlign: 'right' }}>
                      <span style={{ backgroundColor: getStatusColor(app.Status), color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', display: 'inline-block', marginBottom: '0.5rem' }}>
                        {app.Status}
                      </span>
                      <div>
                        <select 
                          value={app.Status} 
                          onChange={(e) => handleStatusUpdate(app.ApplicationId, e.target.value)}
                          style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #ccc', width: '100%' }}
                        >
                          <option value="Submitted">Submitted</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  {app.CoverLetter && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                      <strong>Cover Letter:</strong>
                      <p style={{ margin: '0.5rem 0 0 0', whiteSpace: 'pre-wrap' }}>{app.CoverLetter}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'post' && (
        <div>
          <h2>Post New Job Requisition</h2>
          <form onSubmit={handlePostJob} style={{ maxWidth: '600px' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Job Title *</label>
              <input
                type="text"
                value={newJob.jobTitle}
                onChange={(e) => setNewJob({ ...newJob, jobTitle: e.target.value })}
                required
                placeholder="e.g., Senior Structural Engineer"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Civil Domain *</label>
              <select
                value={newJob.civilDomain}
                onChange={(e) => setNewJob({ ...newJob, civilDomain: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                {civilDomains.map(domain => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Location *</label>
              <input
                type="text"
                value={newJob.jobLocation}
                onChange={(e) => setNewJob({ ...newJob, jobLocation: e.target.value })}
                required
                placeholder="e.g., Seattle, WA"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Salary (Annual)</label>
              <input
                type="number"
                value={newJob.salary}
                onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                placeholder="e.g., 85000"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Required Skills *</label>
              <input
                type="text"
                value={newJob.requiredSkills}
                onChange={(e) => setNewJob({ ...newJob, requiredSkills: e.target.value })}
                required
                placeholder="e.g., AutoCAD, ETABS, Project Management"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Job Description *</label>
              <textarea
                value={newJob.jobDescription}
                onChange={(e) => setNewJob({ ...newJob, jobDescription: e.target.value })}
                required
                rows={5}
                placeholder="Describe the role, responsibilities, and requirements..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
              />
            </div>
            <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}>
              Post Job
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default EmployerDashboard;
