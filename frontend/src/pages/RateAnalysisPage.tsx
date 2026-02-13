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

const RateAnalysisPage: React.FC = () => {
  const { userId, role } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<'rates' | 'subscription'>('rates');
  
  // Subscription state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  
  // Rate data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [rateItems, setRateItems] = useState<RateItem[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedItem, setSelectedItem] = useState<RateItem | null>(null);
  
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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
