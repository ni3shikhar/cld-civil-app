import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../hooks';
import { rateAnalysisService } from '../services/api';

interface Plan {
  PlanId: number;
  PlanName: string;
  Description: string;
  Price: number;
  DurationDays: number;
  Features: string;
}

interface Subscription {
  SubscriptionId: number;
  UserId: number;
  PlanId: number;
  StartDate: string;
  EndDate: string;
  Status: string;
  IsAdminEnabled: boolean;
  PlanName: string;
  PlanDescription: string;
  Price: number;
  Features: string;
}

interface Category {
  CategoryId: number;
  CategoryName: string;
  Description: string;
}

interface RateItem {
  RateItemId: number;
  ItemCode: string;
  ItemName: string;
  Description: string;
  Unit: string;
  MaterialRate: number;
  LaborRate: number;
  EquipmentRate: number;
  TotalRate: number;
  CivilDomain: string;
  CategoryName: string;
}

interface CompositeItem {
  CompositeItemId: number;
  ItemCode: string;
  ItemName: string;
  Description: string;
  Unit: string;
  UnitOfMeasure: string;
  TotalRate: number;
  CivilDomain: string;
  CategoryName: string;
}

interface UserJob {
  JobId: number;
  UserId: number;
  JobName: string;
  JobDescription: string;
  ClientName: string;
  ProjectLocation: string;
  Status: string;
  TotalMaterialCost: number;
  TotalLaborCost: number;
  TotalMachineryCost: number;
  TotalOverheadCost: number;
  GrandTotal: number;
  EstimatedStartDate: string;
  EstimatedEndDate: string;
  CreatedDate: string;
  items?: JobItem[];
}

interface JobItem {
  JobItemId: number;
  CompositeItemId: number;
  Quantity: number;
  CalculatedTotal: number;
  TotalCost: number;
  ItemCode: string;
  ItemName: string;
  Unit: string;
  UnitOfMeasure: string;
  UnitRate: number;
  Notes: string;
}

const RateAnalysisPage: React.FC = () => {
  const { userId, role } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<'rates' | 'jobs' | 'subscription'>('rates');
  
  // Subscription state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  
  // Rate data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [rateItems, setRateItems] = useState<RateItem[]>([]);
  const [compositeItems, setCompositeItems] = useState<CompositeItem[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedItem, setSelectedItem] = useState<RateItem | null>(null);
  
  // Job state
  const [userJobs, setUserJobs] = useState<UserJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showJobDetailModal, setShowJobDetailModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<UserJob | null>(null);
  const [editingJob, setEditingJob] = useState<UserJob | null>(null);
  const [jobForm, setJobForm] = useState({
    jobName: '', jobDescription: '', clientName: '', projectLocation: '', estimatedStartDate: '', estimatedEndDate: ''
  });
  const [addItemForm, setAddItemForm] = useState({ compositeItemId: 0, quantity: 1, notes: '' });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const civilDomains = ['Structural', 'Geotechnical', 'Transportation', 'Water Resources', 'Environmental', 'Construction Management'];

  useEffect(() => {
    loadPlans();
    if (userId) {
      checkSubscription();
    }
  }, [userId]);

  useEffect(() => {
    if (hasActiveSubscription) {
      loadCategories();
      loadRateItems();
      loadCompositeItems();
      loadUserJobs();
    }
  }, [hasActiveSubscription, selectedCategory, selectedDomain]);

  const loadPlans = async () => {
    try {
      const response = await rateAnalysisService.getPlans();
      setPlans(response.data);
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  };

  const checkSubscription = async () => {
    try {
      setLoadingSubscription(true);
      const response = await rateAnalysisService.getSubscription(userId!);
      setSubscription(response.data.subscription);
      setHasActiveSubscription(response.data.isActive);
    } catch (error) {
      console.error('Failed to check subscription:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await rateAnalysisService.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadRateItems = async () => {
    try {
      setLoadingRates(true);
      const params: any = {};
      if (selectedCategory) params.categoryId = selectedCategory;
      if (selectedDomain) params.domain = selectedDomain;
      if (searchTerm) params.search = searchTerm;
      
      const response = await rateAnalysisService.getItems(params);
      setRateItems(response.data);
    } catch (error) {
      console.error('Failed to load rate items:', error);
    } finally {
      setLoadingRates(false);
    }
  };

  const loadCompositeItems = async () => {
    try {
      const response = await rateAnalysisService.getCompositeItems();
      setCompositeItems(response.data);
    } catch (error) {
      console.error('Failed to load composite items:', error);
    }
  };

  const loadUserJobs = async () => {
    try {
      setLoadingJobs(true);
      const response = await rateAnalysisService.getUserJobs(userId!);
      setUserJobs(response.data);
    } catch (error) {
      console.error('Failed to load user jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await rateAnalysisService.createUserJob({ ...jobForm, userId: parseInt(userId!) });
      setSuccess('Job created successfully!');
      setShowJobModal(false);
      resetJobForm();
      loadUserJobs();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create job');
    }
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    try {
      setError('');
      await rateAnalysisService.updateUserJob(editingJob.JobId, { ...jobForm, status: editingJob.Status });
      setSuccess('Job updated successfully!');
      setShowJobModal(false);
      setEditingJob(null);
      resetJobForm();
      loadUserJobs();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update job');
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!window.confirm('Are you sure you want to delete this job? All items will be removed.')) return;
    try {
      await rateAnalysisService.deleteUserJob(jobId);
      setSuccess('Job deleted successfully!');
      loadUserJobs();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete job');
    }
  };

  const viewJobDetail = async (job: UserJob) => {
    try {
      const response = await rateAnalysisService.getUserJob(userId!, job.JobId);
      setSelectedJob(response.data);
      setShowJobDetailModal(true);
    } catch (error: any) {
      setError('Failed to load job details');
    }
  };

  const handleAddJobItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    try {
      setError('');
      await rateAnalysisService.addJobItem(selectedJob.JobId, addItemForm);
      setSuccess('Item added to job!');
      setShowAddItemModal(false);
      setAddItemForm({ compositeItemId: 0, quantity: 1, notes: '' });
      // Refresh job details
      const response = await rateAnalysisService.getUserJob(userId!, selectedJob.JobId);
      setSelectedJob(response.data);
      loadUserJobs();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to add item');
    }
  };

  const handleRemoveJobItem = async (itemId: number) => {
    if (!selectedJob) return;
    if (!window.confirm('Remove this item from the job?')) return;
    try {
      await rateAnalysisService.removeJobItem(selectedJob.JobId, itemId);
      setSuccess('Item removed from job');
      // Refresh job details
      const response = await rateAnalysisService.getUserJob(userId!, selectedJob.JobId);
      setSelectedJob(response.data);
      loadUserJobs();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to remove item');
    }
  };

  const resetJobForm = () => {
    setJobForm({ jobName: '', jobDescription: '', clientName: '', projectLocation: '', estimatedStartDate: '', estimatedEndDate: '' });
  };

  const openEditJobModal = (job: UserJob) => {
    setEditingJob(job);
    setJobForm({
      jobName: job.JobName,
      jobDescription: job.JobDescription || '',
      clientName: job.ClientName || '',
      projectLocation: job.ProjectLocation || '',
      estimatedStartDate: job.EstimatedStartDate ? job.EstimatedStartDate.split('T')[0] : '',
      estimatedEndDate: job.EstimatedEndDate ? job.EstimatedEndDate.split('T')[0] : ''
    });
    setShowJobModal(true);
  };

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const handleSubscribe = async (planId: number) => {
    try {
      setError('');
      await rateAnalysisService.subscribe({ userId: parseInt(userId!), planId });
      setSuccess('Successfully subscribed to Rate Analysis!');
      await checkSubscription();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to subscribe');
    }
  };

  const handleUnsubscribe = async () => {
    try {
      setError('');
      await rateAnalysisService.unsubscribe(userId!);
      setSuccess('Subscription cancelled');
      await checkSubscription();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to cancel subscription');
    }
  };

  const handleSearch = () => {
    loadRateItems();
  };

  const parseFeatures = (features: string): string[] => {
    try {
      return JSON.parse(features);
    } catch {
      return [];
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loadingSubscription) {
    return <div className="dashboard-container" style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>;
  }

  return (
    <div className="dashboard-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>📊 Rate Analysis</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>
            Access construction rates, material costs, and labor rates for civil engineering projects
          </p>
        </div>
        {hasActiveSubscription && (
          <span style={{ 
            backgroundColor: '#e8f5e9', 
            color: '#2e7d32', 
            padding: '0.5rem 1rem', 
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: 500
          }}>
            ✓ Active Subscription
          </span>
        )}
      </div>

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

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          onClick={() => setActiveTab('rates')}
          className="dashboard-tab"
          style={{
            backgroundColor: activeTab === 'rates' ? '#1976D2' : 'transparent',
            color: activeTab === 'rates' ? 'white' : '#333',
            borderBottom: activeTab === 'rates' ? '3px solid #1976D2' : '3px solid transparent',
            fontWeight: activeTab === 'rates' ? 600 : 400
          }}
        >
          Rate Data
        </button>
        {hasActiveSubscription && (
          <button
            onClick={() => setActiveTab('jobs')}
            className="dashboard-tab"
            style={{
              backgroundColor: activeTab === 'jobs' ? '#1976D2' : 'transparent',
              color: activeTab === 'jobs' ? 'white' : '#333',
              borderBottom: activeTab === 'jobs' ? '3px solid #1976D2' : '3px solid transparent',
              fontWeight: activeTab === 'jobs' ? 600 : 400
            }}
          >
            My Jobs
          </button>
        )}
        <button
          onClick={() => setActiveTab('subscription')}
          className="dashboard-tab"
          style={{
            backgroundColor: activeTab === 'subscription' ? '#1976D2' : 'transparent',
            color: activeTab === 'subscription' ? 'white' : '#333',
            borderBottom: activeTab === 'subscription' ? '3px solid #1976D2' : '3px solid transparent',
            fontWeight: activeTab === 'subscription' ? 600 : 400
          }}
        >
          My Subscription
        </button>
      </div>

      {/* Rate Data Tab */}
      {activeTab === 'rates' && (
        <>
          {!hasActiveSubscription ? (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f5f5f5', borderRadius: '12px' }}>
              <h2 style={{ color: '#1976D2' }}>🔒 Subscribe to Access Rate Data</h2>
              <p style={{ color: '#666', maxWidth: '500px', margin: '1rem auto' }}>
                Get access to comprehensive construction rates, material costs, and labor rates for civil engineering projects.
              </p>
              <button
                onClick={() => setActiveTab('subscription')}
                style={{
                  padding: '1rem 2rem',
                  backgroundColor: '#1976D2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                View Subscription Plans
              </button>
            </div>
          ) : (
            <div>
              {/* Filters */}
              <div className="filter-section">
                <input
                  type="text"
                  placeholder="Search rates by name, code, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="filter-input"
                  style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd' }}
                />
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                  className="filter-select"
                  style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd' }}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.CategoryId} value={cat.CategoryId}>{cat.CategoryName}</option>
                  ))}
                </select>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="filter-select"
                  style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd' }}
                >
                  <option value="">All Domains</option>
                  {civilDomains.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <button
                  onClick={handleSearch}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#1976D2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Search
                </button>
              </div>

              {/* Rate Items Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>Code</th>
                      <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>Item Name</th>
                      <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>Unit</th>
                      <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0' }}>Material</th>
                      <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0' }}>Labor</th>
                      <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0' }}>Equipment</th>
                      <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0', fontWeight: 'bold' }}>Total Rate</th>
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #e0e0e0' }}>Domain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingRates ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Loading rates...</td>
                      </tr>
                    ) : rateItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No rate items found</td>
                      </tr>
                    ) : (
                      rateItems.map(item => (
                        <tr 
                          key={item.RateItemId} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedItem(item)}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee', fontFamily: 'monospace', color: '#1976D2' }}>
                            {item.ItemCode}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee' }}>
                            <div style={{ fontWeight: 500 }}>{item.ItemName}</div>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>{item.CategoryName}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                            {item.Unit}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                            {formatCurrency(item.MaterialRate)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                            {formatCurrency(item.LaborRate)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                            {formatCurrency(item.EquipmentRate)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 'bold', color: '#2e7d32' }}>
                            {formatCurrency(item.TotalRate)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                            <span style={{ 
                              backgroundColor: '#e3f2fd', 
                              color: '#1565C0', 
                              padding: '0.25rem 0.5rem', 
                              borderRadius: '4px',
                              fontSize: '0.8rem'
                            }}>
                              {item.CivilDomain}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <p style={{ marginTop: '1rem', color: '#666', fontSize: '0.9rem' }}>
                Showing {rateItems.length} rate items
              </p>
            </div>
          )}
        </>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && hasActiveSubscription && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>📋 My Cost Estimation Jobs</h2>
            <button
              onClick={() => { setEditingJob(null); resetJobForm(); setShowJobModal(true); }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#1976D2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              + Create New Job
            </button>
          </div>

          {loadingJobs ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading jobs...</div>
          ) : userJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f5f5f5', borderRadius: '12px' }}>
              <h3 style={{ color: '#666' }}>No jobs yet</h3>
              <p style={{ color: '#888' }}>Create your first cost estimation job to get started</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {userJobs.map(job => (
                <div key={job.JobId} style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: '1px solid #eee'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, color: '#333' }}>{job.JobName}</h3>
                      {job.JobDescription && <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>{job.JobDescription}</p>}
                      <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        {job.ClientName && <span style={{ color: '#888', fontSize: '0.85rem' }}>👤 {job.ClientName}</span>}
                        {job.ProjectLocation && <span style={{ color: '#888', fontSize: '0.85rem' }}>📍 {job.ProjectLocation}</span>}
                        <span style={{ color: '#888', fontSize: '0.85rem' }}>📅 {new Date(job.CreatedDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1976D2' }}>
                        {formatINR(job.GrandTotal || 0)}
                      </div>
                      <span style={{
                        display: 'inline-block',
                        marginTop: '0.5rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        backgroundColor: job.Status === 'Completed' ? '#e8f5e9' : job.Status === 'In Progress' ? '#e3f2fd' : '#f5f5f5',
                        color: job.Status === 'Completed' ? '#2e7d32' : job.Status === 'In Progress' ? '#1976D2' : '#666'
                      }}>
                        {job.Status}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                    <button
                      onClick={() => viewJobDetail(job)}
                      style={{ padding: '0.5rem 1rem', backgroundColor: '#e3f2fd', color: '#1976D2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => openEditJobModal(job)}
                      style={{ padding: '0.5rem 1rem', backgroundColor: '#fff3e0', color: '#e65100', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.JobId)}
                      style={{ padding: '0.5rem 1rem', backgroundColor: '#ffebee', color: '#c62828', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Job Create/Edit Modal */}
      {showJobModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>{editingJob ? 'Edit Job' : 'Create New Job'}</h2>
            <form onSubmit={editingJob ? handleUpdateJob : handleCreateJob}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Job Name *</label>
                <input
                  type="text"
                  value={jobForm.jobName}
                  onChange={e => setJobForm({ ...jobForm, jobName: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
                <textarea
                  value={jobForm.jobDescription}
                  onChange={e => setJobForm({ ...jobForm, jobDescription: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem', resize: 'vertical' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Client Name</label>
                <input
                  type="text"
                  value={jobForm.clientName}
                  onChange={e => setJobForm({ ...jobForm, clientName: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Project Location</label>
                <input
                  type="text"
                  value={jobForm.projectLocation}
                  onChange={e => setJobForm({ ...jobForm, projectLocation: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Estimated Start</label>
                  <input
                    type="date"
                    value={jobForm.estimatedStartDate}
                    onChange={e => setJobForm({ ...jobForm, estimatedStartDate: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Estimated End</label>
                  <input
                    type="date"
                    value={jobForm.estimatedEndDate}
                    onChange={e => setJobForm({ ...jobForm, estimatedEndDate: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowJobModal(false); setEditingJob(null); resetJobForm(); }}
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f5f5f5', color: '#666', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1976D2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {editingJob ? 'Update Job' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {showJobDetailModal && selectedJob && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', width: '95%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>{selectedJob.JobName}</h2>
                {selectedJob.ClientName && <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>Client: {selectedJob.ClientName}</p>}
                {selectedJob.ProjectLocation && <p style={{ margin: '0.25rem 0 0 0', color: '#666' }}>Location: {selectedJob.ProjectLocation}</p>}
              </div>
              <button
                onClick={() => { setShowJobDetailModal(false); setSelectedJob(null); }}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Job Items</h3>
              <button
                onClick={() => setShowAddItemModal(true)}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#1976D2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
              >
                + Add Item
              </button>
            </div>

            {selectedJob.items && selectedJob.items.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Item</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Qty</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Unit Rate</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Total</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedJob.items.map((item: JobItem) => (
                      <tr key={item.JobItemId} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 500 }}>{item.ItemName || `Item #${item.CompositeItemId}`}</div>
                          {item.Notes && <div style={{ fontSize: '0.85rem', color: '#666' }}>{item.Notes}</div>}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.Quantity} {item.UnitOfMeasure || 'units'}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatINR(item.UnitRate || 0)}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>{formatINR(item.TotalCost || 0)}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveJobItem(item.JobItemId)}
                            style={{ padding: '0.25rem 0.5rem', backgroundColor: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#e3f2fd' }}>
                      <td colSpan={3} style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, fontSize: '1.1rem' }}>Grand Total:</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, fontSize: '1.2rem', color: '#1976D2' }}>{formatINR(selectedJob.GrandTotal || 0)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                <p style={{ color: '#666' }}>No items added yet. Add items to calculate job cost.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Item to Job Modal */}
      {showAddItemModal && selectedJob && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', width: '90%', maxWidth: '500px' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Add Item to Job</h2>
            <form onSubmit={handleAddJobItem}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Item *</label>
                <select
                  value={addItemForm.compositeItemId}
                  onChange={e => setAddItemForm({ ...addItemForm, compositeItemId: parseInt(e.target.value) })}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
                >
                  <option value={0}>-- Select an item --</option>
                  {compositeItems.map(item => (
                    <option key={item.CompositeItemId} value={item.CompositeItemId}>
                      {item.ItemName} ({item.UnitOfMeasure}) - {formatINR(item.TotalRate || 0)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Quantity *</label>
                <input
                  type="number"
                  value={addItemForm.quantity}
                  onChange={e => setAddItemForm({ ...addItemForm, quantity: parseFloat(e.target.value) || 0 })}
                  min={0.01}
                  step={0.01}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Notes</label>
                <input
                  type="text"
                  value={addItemForm.notes}
                  onChange={e => setAddItemForm({ ...addItemForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
                  placeholder="Optional notes for this item"
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddItemModal(false); setAddItemForm({ compositeItemId: 0, quantity: 1, notes: '' }); }}
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f5f5f5', color: '#666', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1976D2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <div>
          {/* Current Subscription Status */}
          {subscription && (
            <div style={{ 
              backgroundColor: hasActiveSubscription ? '#e8f5e9' : '#fff3e0', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              marginBottom: '2rem',
              border: `1px solid ${hasActiveSubscription ? '#a5d6a7' : '#ffcc80'}`
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: hasActiveSubscription ? '#2e7d32' : '#e65100' }}>
                {hasActiveSubscription ? '✓ Active Subscription' : '⚠ Subscription Inactive'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Plan</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontWeight: 500 }}>{subscription.PlanName}</p>
                </div>
                <div>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Start Date</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontWeight: 500 }}>{formatDate(subscription.StartDate)}</p>
                </div>
                <div>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>End Date</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontWeight: 500 }}>{formatDate(subscription.EndDate)}</p>
                </div>
                <div>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Status</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontWeight: 500 }}>
                    {subscription.Status}
                    {!subscription.IsAdminEnabled && <span style={{ color: '#f44336' }}> (Admin Disabled)</span>}
                  </p>
                </div>
              </div>
              {hasActiveSubscription && (
                <button
                  onClick={handleUnsubscribe}
                  style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: 'transparent',
                    color: '#f44336',
                    border: '1px solid #f44336',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          )}

          {/* Available Plans */}
          <h2 style={{ marginBottom: '1rem' }}>Available Plans</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {plans.map(plan => (
              <div 
                key={plan.PlanId}
                style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '12px', 
                  padding: '1.5rem',
                  border: plan.PlanName === 'Professional' ? '2px solid #1976D2' : '1px solid #e0e0e0',
                  position: 'relative'
                }}
              >
                {plan.PlanName === 'Professional' && (
                  <span style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '20px',
                    backgroundColor: '#1976D2',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}>
                    POPULAR
                  </span>
                )}
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>{plan.PlanName}</h3>
                <p style={{ color: '#666', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>{plan.Description}</p>
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1976D2' }}>
                    {plan.Price === 0 ? 'Free' : formatCurrency(plan.Price)}
                  </span>
                  {plan.Price > 0 && <span style={{ color: '#666' }}>/year</span>}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0' }}>
                  {parseFeatures(plan.Features).map((feature, idx) => (
                    <li key={idx} style={{ padding: '0.5rem 0', color: '#444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#4CAF50' }}>✓</span> {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(plan.PlanId)}
                  disabled={hasActiveSubscription && subscription?.PlanId === plan.PlanId}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: hasActiveSubscription && subscription?.PlanId === plan.PlanId ? '#e0e0e0' : '#1976D2',
                    color: hasActiveSubscription && subscription?.PlanId === plan.PlanId ? '#666' : 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: hasActiveSubscription && subscription?.PlanId === plan.PlanId ? 'not-allowed' : 'pointer'
                  }}
                >
                  {hasActiveSubscription && subscription?.PlanId === plan.PlanId ? 'Current Plan' : 'Subscribe'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rate Item Detail Modal */}
      {selectedItem && (
        <div 
          className="modal-overlay"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontFamily: 'monospace', color: '#1976D2', fontSize: '0.9rem' }}>{selectedItem.ItemCode}</span>
                <h2 style={{ margin: '0.25rem 0 0 0' }}>{selectedItem.ItemName}</h2>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}
              >
                ×
              </button>
            </div>
            
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>{selectedItem.Description}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Unit</p>
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: 500, textTransform: 'uppercase' }}>{selectedItem.Unit}</p>
              </div>
              <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Category</p>
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: 500 }}>{selectedItem.CategoryName}</p>
              </div>
              <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Domain</p>
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: 500 }}>{selectedItem.CivilDomain}</p>
              </div>
              <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Total Rate</p>
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: 'bold', fontSize: '1.25rem', color: '#2e7d32' }}>
                  {formatCurrency(selectedItem.TotalRate)}
                </p>
              </div>
            </div>

            <h4 style={{ marginBottom: '1rem' }}>Rate Breakdown</h4>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1, padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#1565C0', fontSize: '0.8rem' }}>Material</p>
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600 }}>{formatCurrency(selectedItem.MaterialRate)}</p>
              </div>
              <div style={{ flex: 1, padding: '1rem', backgroundColor: '#fff3e0', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#e65100', fontSize: '0.8rem' }}>Labor</p>
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600 }}>{formatCurrency(selectedItem.LaborRate)}</p>
              </div>
              <div style={{ flex: 1, padding: '1rem', backgroundColor: '#f3e5f5', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#7b1fa2', fontSize: '0.8rem' }}>Equipment</p>
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600 }}>{formatCurrency(selectedItem.EquipmentRate)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateAnalysisPage;
