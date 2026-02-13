import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../hooks';
import { rateAnalysisService } from '../services/api';

interface Material {
  MaterialId: number;
  MaterialCode: string;
  MaterialName: string;
  Description: string;
  Unit: string;
  UnitRate: number;
  CategoryId: number;
  CategoryName: string;
  SupplierInfo: string;
  IsActive: boolean;
}

interface Labor {
  LaborId: number;
  LaborCode: string;
  LaborType: string;
  Description: string;
  SkillLevel: string;
  Unit: string;
  UnitRate: number;
  OvertimeRate: number;
  CategoryId: number;
  CategoryName: string;
  IsActive: boolean;
}

interface Machinery {
  MachineryId: number;
  MachineryCode: string;
  MachineryName: string;
  Description: string;
  MachineryType: string;
  Capacity: string;
  Unit: string;
  UnitRate: number;
  FuelIncluded: boolean;
  OperatorIncluded: boolean;
  CategoryId: number;
  CategoryName: string;
  IsActive: boolean;
}

interface CompositeItem {
  CompositeItemId: number;
  ItemCode: string;
  ItemName: string;
  Description: string;
  Unit: string;
  CategoryId: number;
  CategoryName: string;
  CivilDomain: string;
  MaterialCost: number;
  LaborCost: number;
  MachineryCost: number;
  OverheadPercent: number;
  TotalRate: number;
  IsActive: boolean;
  components?: any[];
}

interface Category {
  CategoryId: number;
  CategoryName: string;
  Description: string;
}

const AdminRateConfigPage: React.FC = () => {
  const { userId } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<'materials' | 'labor' | 'machinery' | 'composite'>('materials');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [materials, setMaterials] = useState<Material[]>([]);
  const [labor, setLabor] = useState<Labor[]>([]);
  const [machinery, setMachinery] = useState<Machinery[]>([]);
  const [compositeItems, setCompositeItems] = useState<CompositeItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filter states
  const [searchFilter, setSearchFilter] = useState('');

  // Modal states
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showLaborModal, setShowLaborModal] = useState(false);
  const [showMachineryModal, setShowMachineryModal] = useState(false);
  const [showCompositeModal, setShowCompositeModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states
  const [materialForm, setMaterialForm] = useState({
    materialCode: '', materialName: '', description: '', unit: 'kg', unitRate: 0, categoryId: 0, supplierInfo: ''
  });
  const [laborForm, setLaborForm] = useState({
    laborCode: '', laborType: '', description: '', skillLevel: 'Skilled', unit: 'day', unitRate: 0, overtimeRate: 0, categoryId: 0
  });
  const [machineryForm, setMachineryForm] = useState({
    machineryCode: '', machineryName: '', description: '', machineryType: '', capacity: '', unit: 'hour', unitRate: 0, fuelIncluded: true, operatorIncluded: false, categoryId: 0
  });
  const [compositeForm, setCompositeForm] = useState({
    itemCode: '', itemName: '', description: '', unit: 'cum', categoryId: 0, civilDomain: 'Structural', overheadPercent: 10, notes: '', components: [] as any[]
  });

  const units = ['kg', 'cum', 'sqm', 'rm', 'nos', 'litre', 'bag', 'day', 'hour', 'trip', 'shift', 'month'];
  const skillLevels = ['Unskilled', 'Semi-skilled', 'Skilled', 'Highly-skilled'];
  const civilDomains = ['Structural', 'Geotechnical', 'Transportation', 'Water Resources', 'Environmental', 'Construction Management'];
  const machineryTypes = ['Excavator', 'Loader', 'Mixer', 'Vibrator', 'Batching', 'Transit Mixer', 'Pump', 'Crane', 'Compactor', 'Paver', 'Transport', 'Compressor', 'Welding'];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [catRes, matRes, labRes, machRes, compRes] = await Promise.all([
        rateAnalysisService.getCategories(),
        rateAnalysisService.getMaterials(),
        rateAnalysisService.getLabor(),
        rateAnalysisService.getMachinery(),
        rateAnalysisService.getAdminCompositeItems()
      ]);
      setCategories(catRes.data);
      setMaterials(matRes.data);
      setLabor(labRes.data);
      setMachinery(machRes.data);
      setCompositeItems(compRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load rate data');
    } finally {
      setLoading(false);
    }
  };

  // Filter helpers
  const filteredMaterials = materials.filter(m =>
    !searchFilter || m.MaterialName.toLowerCase().includes(searchFilter.toLowerCase()) ||
    m.MaterialCode.toLowerCase().includes(searchFilter.toLowerCase())
  );
  const filteredLabor = labor.filter(l =>
    !searchFilter || l.LaborType.toLowerCase().includes(searchFilter.toLowerCase()) ||
    l.LaborCode.toLowerCase().includes(searchFilter.toLowerCase())
  );
  const filteredMachinery = machinery.filter(m =>
    !searchFilter || m.MachineryName.toLowerCase().includes(searchFilter.toLowerCase()) ||
    m.MachineryCode.toLowerCase().includes(searchFilter.toLowerCase())
  );
  const filteredCompositeItems = compositeItems.filter(c =>
    !searchFilter || c.ItemName.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.ItemCode.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Material CRUD
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingItem) {
        await rateAnalysisService.updateMaterial(editingItem.MaterialId, materialForm);
        setSuccess('Material updated successfully!');
      } else {
        await rateAnalysisService.createMaterial({ ...materialForm, createdBy: userId });
        setSuccess('Material created successfully!');
      }
      setShowMaterialModal(false);
      setEditingItem(null);
      resetMaterialForm();
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save material');
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    try {
      await rateAnalysisService.deleteMaterial(id);
      setSuccess('Material deleted successfully!');
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete material');
    }
  };

  const resetMaterialForm = () => {
    setMaterialForm({ materialCode: '', materialName: '', description: '', unit: 'kg', unitRate: 0, categoryId: 0, supplierInfo: '' });
  };

  // Labor CRUD
  const handleSaveLabor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingItem) {
        await rateAnalysisService.updateLabor(editingItem.LaborId, laborForm);
        setSuccess('Labor rate updated successfully!');
      } else {
        await rateAnalysisService.createLabor({ ...laborForm, createdBy: userId });
        setSuccess('Labor rate created successfully!');
      }
      setShowLaborModal(false);
      setEditingItem(null);
      resetLaborForm();
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save labor rate');
    }
  };

  const handleDeleteLabor = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this labor rate?')) return;
    try {
      await rateAnalysisService.deleteLabor(id);
      setSuccess('Labor rate deleted successfully!');
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete labor rate');
    }
  };

  const resetLaborForm = () => {
    setLaborForm({ laborCode: '', laborType: '', description: '', skillLevel: 'Skilled', unit: 'day', unitRate: 0, overtimeRate: 0, categoryId: 0 });
  };

  // Machinery CRUD
  const handleSaveMachinery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingItem) {
        await rateAnalysisService.updateMachinery(editingItem.MachineryId, machineryForm);
        setSuccess('Machinery rate updated successfully!');
      } else {
        await rateAnalysisService.createMachinery({ ...machineryForm, createdBy: userId });
        setSuccess('Machinery rate created successfully!');
      }
      setShowMachineryModal(false);
      setEditingItem(null);
      resetMachineryForm();
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save machinery rate');
    }
  };

  const handleDeleteMachinery = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this machinery rate?')) return;
    try {
      await rateAnalysisService.deleteMachinery(id);
      setSuccess('Machinery rate deleted successfully!');
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete machinery rate');
    }
  };

  const resetMachineryForm = () => {
    setMachineryForm({ machineryCode: '', machineryName: '', description: '', machineryType: '', capacity: '', unit: 'hour', unitRate: 0, fuelIncluded: true, operatorIncluded: false, categoryId: 0 });
  };

  // Composite Item CRUD
  const handleSaveCompositeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingItem) {
        await rateAnalysisService.updateCompositeItem(editingItem.CompositeItemId, compositeForm);
        setSuccess('Composite item updated successfully!');
      } else {
        await rateAnalysisService.createCompositeItem({ ...compositeForm, createdBy: userId });
        setSuccess('Composite item created successfully!');
      }
      setShowCompositeModal(false);
      setEditingItem(null);
      resetCompositeForm();
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save composite item');
    }
  };

  const handleDeleteCompositeItem = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this composite item?')) return;
    try {
      await rateAnalysisService.deleteCompositeItem(id);
      setSuccess('Composite item deleted successfully!');
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete composite item');
    }
  };

  const resetCompositeForm = () => {
    setCompositeForm({ itemCode: '', itemName: '', description: '', unit: 'cum', categoryId: 0, civilDomain: 'Structural', overheadPercent: 10, notes: '', components: [] });
  };

  const handleRecalculateRates = async () => {
    try {
      const result = await rateAnalysisService.recalculateRates();
      setSuccess(`Recalculated rates for ${result.data.count} items`);
      fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to recalculate rates');
    }
  };

  // Edit handlers
  const editMaterial = (m: Material) => {
    setEditingItem(m);
    setMaterialForm({
      materialCode: m.MaterialCode,
      materialName: m.MaterialName,
      description: m.Description || '',
      unit: m.Unit,
      unitRate: m.UnitRate,
      categoryId: m.CategoryId || 0,
      supplierInfo: m.SupplierInfo || ''
    });
    setShowMaterialModal(true);
  };

  const editLabor = (l: Labor) => {
    setEditingItem(l);
    setLaborForm({
      laborCode: l.LaborCode,
      laborType: l.LaborType,
      description: l.Description || '',
      skillLevel: l.SkillLevel,
      unit: l.Unit,
      unitRate: l.UnitRate,
      overtimeRate: l.OvertimeRate || 0,
      categoryId: l.CategoryId || 0
    });
    setShowLaborModal(true);
  };

  const editMachinery = (m: Machinery) => {
    setEditingItem(m);
    setMachineryForm({
      machineryCode: m.MachineryCode,
      machineryName: m.MachineryName,
      description: m.Description || '',
      machineryType: m.MachineryType || '',
      capacity: m.Capacity || '',
      unit: m.Unit,
      unitRate: m.UnitRate,
      fuelIncluded: m.FuelIncluded,
      operatorIncluded: m.OperatorIncluded,
      categoryId: m.CategoryId || 0
    });
    setShowMachineryModal(true);
  };

  const editCompositeItem = async (c: CompositeItem) => {
    try {
      const detail = await rateAnalysisService.getAdminCompositeItem(c.CompositeItemId);
      setEditingItem(detail.data);
      setCompositeForm({
        itemCode: detail.data.ItemCode,
        itemName: detail.data.ItemName,
        description: detail.data.Description || '',
        unit: detail.data.Unit,
        categoryId: detail.data.CategoryId || 0,
        civilDomain: detail.data.CivilDomain || 'Structural',
        overheadPercent: detail.data.OverheadPercent || 10,
        notes: detail.data.Notes || '',
        components: detail.data.components || []
      });
      setShowCompositeModal(true);
    } catch (err: any) {
      setError('Failed to load composite item details');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading rate configuration...</div>;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Rate Configuration</h1>
        <button onClick={handleRecalculateRates} style={{ padding: '0.5rem 1rem', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Recalculate All Rates
        </button>
      </div>

      {error && <p style={{ color: 'red', padding: '0.5rem', backgroundColor: '#ffebee', borderRadius: '4px', marginBottom: '1rem' }}>{error}</p>}
      {success && <p style={{ color: 'green', padding: '0.5rem', backgroundColor: '#e8f5e9', borderRadius: '4px', marginBottom: '1rem' }}>{success}</p>}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#1565C0' }}>Materials</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0' }}>{materials.length}</p>
        </div>
        <div style={{ padding: '1.5rem', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#2E7D32' }}>Labor Rates</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0' }}>{labor.length}</p>
        </div>
        <div style={{ padding: '1.5rem', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#E65100' }}>Machinery</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0' }}>{machinery.length}</p>
        </div>
        <div style={{ padding: '1.5rem', backgroundColor: '#f3e5f5', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#7B1FA2' }}>Composite Items</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0' }}>{compositeItems.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['materials', 'labor', 'machinery', 'composite'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSearchFilter(''); }}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              backgroundColor: activeTab === tab ? '#1976D2' : '#f5f5f5',
              color: activeTab === tab ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              textTransform: 'capitalize'
            }}
          >
            {tab === 'composite' ? 'Composite Items' : tab}
          </button>
        ))}
      </div>

      {/* Search and Add Button */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name or code..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', flex: 1, maxWidth: '300px' }}
        />
        <button
          onClick={() => {
            setEditingItem(null);
            if (activeTab === 'materials') { resetMaterialForm(); setShowMaterialModal(true); }
            if (activeTab === 'labor') { resetLaborForm(); setShowLaborModal(true); }
            if (activeTab === 'machinery') { resetMachineryForm(); setShowMachineryModal(true); }
            if (activeTab === 'composite') { resetCompositeForm(); setShowCompositeModal(true); }
          }}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + Add {activeTab === 'composite' ? 'Composite Item' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </button>
      </div>

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Code</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Name</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Unit</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Rate</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Category</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map(m => (
                <tr key={m.MaterialId}>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', fontFamily: 'monospace' }}>{m.MaterialCode}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{m.MaterialName}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>{m.Unit}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatCurrency(m.UnitRate)}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{m.CategoryName || '-'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <button onClick={() => editMaterial(m)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem' }}>Edit</button>
                    <button onClick={() => handleDeleteMaterial(m.MaterialId)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
              {filteredMaterials.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No materials found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Labor Tab */}
      {activeTab === 'labor' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Code</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Type</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Skill Level</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Unit</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Rate</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>OT Rate</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLabor.map(l => (
                <tr key={l.LaborId}>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', fontFamily: 'monospace' }}>{l.LaborCode}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{l.LaborType}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: l.SkillLevel === 'Highly-skilled' ? '#9C27B0' : l.SkillLevel === 'Skilled' ? '#2196F3' : l.SkillLevel === 'Semi-skilled' ? '#FF9800' : '#757575', color: 'white' }}>
                      {l.SkillLevel}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>{l.Unit}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatCurrency(l.UnitRate)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatCurrency(l.OvertimeRate || 0)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <button onClick={() => editLabor(l)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem' }}>Edit</button>
                    <button onClick={() => handleDeleteLabor(l.LaborId)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
              {filteredLabor.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No labor rates found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Machinery Tab */}
      {activeTab === 'machinery' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Code</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Name</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Type</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Capacity</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Unit</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Rate</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Includes</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMachinery.map(m => (
                <tr key={m.MachineryId}>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', fontFamily: 'monospace' }}>{m.MachineryCode}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{m.MachineryName}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>{m.MachineryType || '-'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>{m.Capacity || '-'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>{m.Unit}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatCurrency(m.UnitRate)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    {m.FuelIncluded && <span style={{ backgroundColor: '#4CAF50', color: 'white', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.7rem', marginRight: '0.25rem' }}>Fuel</span>}
                    {m.OperatorIncluded && <span style={{ backgroundColor: '#2196F3', color: 'white', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.7rem' }}>Op</span>}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <button onClick={() => editMachinery(m)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem' }}>Edit</button>
                    <button onClick={() => handleDeleteMachinery(m.MachineryId)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
              {filteredMachinery.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No machinery found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Composite Items Tab */}
      {activeTab === 'composite' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Code</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Name</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Unit</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Material</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Labor</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Machinery</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Total Rate</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Domain</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompositeItems.map(c => (
                <tr key={c.CompositeItemId}>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', fontFamily: 'monospace' }}>{c.ItemCode}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{c.ItemName}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>{c.Unit}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #eee', color: '#1565C0' }}>{formatCurrency(c.MaterialCost)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #eee', color: '#2E7D32' }}>{formatCurrency(c.LaborCost)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #eee', color: '#E65100' }}>{formatCurrency(c.MachineryCost)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>{formatCurrency(c.TotalRate)}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{c.CivilDomain || '-'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <button onClick={() => editCompositeItem(c)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem' }}>Edit</button>
                    <button onClick={() => handleDeleteCompositeItem(c.CompositeItemId)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
              {filteredCompositeItems.length === 0 && (
                <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No composite items found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Material Modal */}
      {showMaterialModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <h2>{editingItem ? 'Edit Material' : 'Add Material'}</h2>
            <form onSubmit={handleSaveMaterial}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Material Code *</label>
                <input type="text" value={materialForm.materialCode} onChange={(e) => setMaterialForm({ ...materialForm, materialCode: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Material Name *</label>
                <input type="text" value={materialForm.materialName} onChange={(e) => setMaterialForm({ ...materialForm, materialName: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Description</label>
                <textarea value={materialForm.description} onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Unit *</label>
                  <select value={materialForm.unit} onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Unit Rate (INR) *</label>
                  <input type="number" step="0.01" value={materialForm.unitRate} onChange={(e) => setMaterialForm({ ...materialForm, unitRate: parseFloat(e.target.value) || 0 })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Category</label>
                <select value={materialForm.categoryId} onChange={(e) => setMaterialForm({ ...materialForm, categoryId: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value={0}>-- Select Category --</option>
                  {categories.map(c => <option key={c.CategoryId} value={c.CategoryId}>{c.CategoryName}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Supplier Info</label>
                <input type="text" value={materialForm.supplierInfo} onChange={(e) => setMaterialForm({ ...materialForm, supplierInfo: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowMaterialModal(false); setEditingItem(null); }} style={{ padding: '0.5rem 1rem', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{editingItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Labor Modal */}
      {showLaborModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <h2>{editingItem ? 'Edit Labor Rate' : 'Add Labor Rate'}</h2>
            <form onSubmit={handleSaveLabor}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Labor Code *</label>
                <input type="text" value={laborForm.laborCode} onChange={(e) => setLaborForm({ ...laborForm, laborCode: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Labor Type *</label>
                <input type="text" value={laborForm.laborType} onChange={(e) => setLaborForm({ ...laborForm, laborType: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Description</label>
                <textarea value={laborForm.description} onChange={(e) => setLaborForm({ ...laborForm, description: e.target.value })} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Skill Level *</label>
                  <select value={laborForm.skillLevel} onChange={(e) => setLaborForm({ ...laborForm, skillLevel: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                    {skillLevels.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Unit *</label>
                  <select value={laborForm.unit} onChange={(e) => setLaborForm({ ...laborForm, unit: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="day">day</option>
                    <option value="hour">hour</option>
                    <option value="shift">shift</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Unit Rate (INR) *</label>
                  <input type="number" step="0.01" value={laborForm.unitRate} onChange={(e) => setLaborForm({ ...laborForm, unitRate: parseFloat(e.target.value) || 0 })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Overtime Rate (INR)</label>
                  <input type="number" step="0.01" value={laborForm.overtimeRate} onChange={(e) => setLaborForm({ ...laborForm, overtimeRate: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowLaborModal(false); setEditingItem(null); }} style={{ padding: '0.5rem 1rem', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{editingItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Machinery Modal */}
      {showMachineryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <h2>{editingItem ? 'Edit Machinery Rate' : 'Add Machinery Rate'}</h2>
            <form onSubmit={handleSaveMachinery}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Machinery Code *</label>
                <input type="text" value={machineryForm.machineryCode} onChange={(e) => setMachineryForm({ ...machineryForm, machineryCode: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Machinery Name *</label>
                <input type="text" value={machineryForm.machineryName} onChange={(e) => setMachineryForm({ ...machineryForm, machineryName: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Description</label>
                <textarea value={machineryForm.description} onChange={(e) => setMachineryForm({ ...machineryForm, description: e.target.value })} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Type</label>
                  <select value={machineryForm.machineryType} onChange={(e) => setMachineryForm({ ...machineryForm, machineryType: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="">-- Select Type --</option>
                    {machineryTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Capacity</label>
                  <input type="text" value={machineryForm.capacity} onChange={(e) => setMachineryForm({ ...machineryForm, capacity: e.target.value })} placeholder="e.g., 10 ton, 480L" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Unit *</label>
                  <select value={machineryForm.unit} onChange={(e) => setMachineryForm({ ...machineryForm, unit: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="hour">hour</option>
                    <option value="day">day</option>
                    <option value="trip">trip</option>
                    <option value="shift">shift</option>
                    <option value="month">month</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Unit Rate (INR) *</label>
                  <input type="number" step="0.01" value={machineryForm.unitRate} onChange={(e) => setMachineryForm({ ...machineryForm, unitRate: parseFloat(e.target.value) || 0 })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={machineryForm.fuelIncluded} onChange={(e) => setMachineryForm({ ...machineryForm, fuelIncluded: e.target.checked })} />
                  Fuel Included
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={machineryForm.operatorIncluded} onChange={(e) => setMachineryForm({ ...machineryForm, operatorIncluded: e.target.checked })} />
                  Operator Included
                </label>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowMachineryModal(false); setEditingItem(null); }} style={{ padding: '0.5rem 1rem', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{editingItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Composite Item Modal */}
      {showCompositeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <h2>{editingItem ? 'Edit Composite Item' : 'Add Composite Item'}</h2>
            <form onSubmit={handleSaveCompositeItem}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Item Code *</label>
                  <input type="text" value={compositeForm.itemCode} onChange={(e) => setCompositeForm({ ...compositeForm, itemCode: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Unit *</label>
                  <select value={compositeForm.unit} onChange={(e) => setCompositeForm({ ...compositeForm, unit: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Item Name *</label>
                <input type="text" value={compositeForm.itemName} onChange={(e) => setCompositeForm({ ...compositeForm, itemName: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Description</label>
                <textarea value={compositeForm.description} onChange={(e) => setCompositeForm({ ...compositeForm, description: e.target.value })} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Category</label>
                  <select value={compositeForm.categoryId} onChange={(e) => setCompositeForm({ ...compositeForm, categoryId: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value={0}>-- Select --</option>
                    {categories.map(c => <option key={c.CategoryId} value={c.CategoryId}>{c.CategoryName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Civil Domain</label>
                  <select value={compositeForm.civilDomain} onChange={(e) => setCompositeForm({ ...compositeForm, civilDomain: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                    {civilDomains.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Overhead %</label>
                  <input type="number" step="0.1" value={compositeForm.overheadPercent} onChange={(e) => setCompositeForm({ ...compositeForm, overheadPercent: parseFloat(e.target.value) || 10 })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              </div>

              {editingItem && editingItem.components && (
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>Current Components</h4>
                  {editingItem.components.length === 0 ? (
                    <p style={{ color: '#666', margin: 0 }}>No components defined</p>
                  ) : (
                    <table style={{ width: '100%', fontSize: '0.9rem' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.25rem' }}>Type</th>
                          <th style={{ textAlign: 'left', padding: '0.25rem' }}>Component</th>
                          <th style={{ textAlign: 'right', padding: '0.25rem' }}>Qty</th>
                          <th style={{ textAlign: 'right', padding: '0.25rem' }}>Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingItem.components.map((c: any, i: number) => (
                          <tr key={i}>
                            <td style={{ padding: '0.25rem' }}>{c.ComponentType}</td>
                            <td style={{ padding: '0.25rem' }}>{c.ComponentName}</td>
                            <td style={{ textAlign: 'right', padding: '0.25rem' }}>{c.Quantity}</td>
                            <td style={{ textAlign: 'right', padding: '0.25rem' }}>{formatCurrency(c.UnitRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
                    Note: To modify components, use the database directly or recalculate rates.
                  </p>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Notes</label>
                <textarea value={compositeForm.notes} onChange={(e) => setCompositeForm({ ...compositeForm, notes: e.target.value })} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowCompositeModal(false); setEditingItem(null); }} style={{ padding: '0.5rem 1rem', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{editingItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRateConfigPage;
