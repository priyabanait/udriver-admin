import { useState, useEffect } from 'react';
import { 
  Car, 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  Plus
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { formatDate } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import toast from 'react-hot-toast';

export default function VehicleDocuments() {
  const { hasPermission } = useAuth();
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const [vehicleDocuments, setVehicleDocuments] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [editingDoc, setEditingDoc] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);

  const fetchAll = async () => {
    try {
      // Build vehicle query params with search
      let vehicleParams = new URLSearchParams({
        page: '1',
        limit: '100'
      });
      
      if (searchTerm && searchTerm.trim()) {
        vehicleParams.append('q', searchTerm.trim());
      }
      
      // Use search endpoint if search term is provided
      const vehicleEndpoint = (searchTerm && searchTerm.trim())
        ? `${API_BASE}/api/vehicles/search?${vehicleParams.toString()}`
        : `${API_BASE}/api/vehicles?${vehicleParams.toString()}`;
      
      const [vehicleRes, driverRes] = await Promise.all([
        fetch(vehicleEndpoint),
        fetch(`${API_BASE}/api/drivers?page=1&limit=100`)
      ]);
      if (!vehicleRes.ok) throw new Error(`Failed to load vehicles: ${vehicleRes.status}`);
      if (!driverRes.ok) throw new Error(`Failed to load drivers: ${driverRes.status}`);
      const vResult = await vehicleRes.json();
      const dResult = await driverRes.json();
      const vehicles = vResult.data || vResult;
      const driversData = dResult.data || dResult;
      setDrivers(driversData);

      // Map vehicles to the document-centric shape expected by this page
      const docs = vehicles.map(v => {
        let driverName = '';
        let driverMobile = '';
        
        // First check if backend provided driverDetails
        if (v.driverDetails) {
          driverName = v.driverDetails.name || '';
          driverMobile = v.driverDetails.mobile || '';
        } 
        // Fallback to frontend lookup
        else if (v.assignedDriver) {
          // Try multiple matching strategies
          const found = driversData.find(d => {
            const assignedValue = String(v.assignedDriver);
            return (
              String(d._id) === assignedValue ||
              String(d.id) === assignedValue ||
              d.mobile === assignedValue ||
              d.phone === assignedValue ||
              d.username === assignedValue ||
              String(d.mobile) === assignedValue ||
              String(d.phone) === assignedValue
            );
          });
          
          if (found) {
            driverName = found.name || found.username || found.mobile || found.phone || '';
            driverMobile = found.mobile || found.phone || '';
          } else {
            // If not found, check if it's already a readable string (not an ObjectId)
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(v.assignedDriver));
            driverName = isObjectId ? '' : String(v.assignedDriver);
          }
        } else {
          driverName = v.driverName || '';
        }
        
        return {
          id: v.vehicleId ?? v.id ?? v._id,
          vehicleNumber: v.registrationNumber || v.registration_number || v.regNo || v.vehicleId || v.id,
          vehicleType: v.model || v.make || v.brand || '',
          driverName: driverName || 'Not Assigned',
          driverMobile,
          documents: {
            registration: {
              expiryDate: v.registrationDate || v.registration_expiry || null,
              uploadDate: v.registrationDate || null,
              status: v.registrationDate ? 'verified' : 'pending'
            },
            insurance: {
              expiryDate: v.insuranceDate || v.insuranceExpiry || null,
              uploadDate: v.insuranceDate || null,
              status: v.insuranceDate ? 'verified' : 'pending'
            },
            puc: {
              expiryDate: v.emissionDate || null,
              uploadDate: v.emissionDate || null,
              status: v.emissionDate ? 'verified' : 'pending'
            },
            permit: {
              expiryDate: v.permitDate || null,
              uploadDate: v.permitDate || null,
              status: v.permitDate ? 'verified' : 'pending'
            },
            // fitness: {
            //   expiryDate: v.fitnessExpiry || v.fitnessDate || null,
            //   uploadDate: v.fitnessExpiry || null,
            //   status: v.fitnessExpiry || v.fitnessDate ? 'verified' : 'pending'
            // }
          }
        };
      });
      setVehicleDocuments(docs);
    } catch (err) {
      console.error('Failed to fetch vehicle documents', err);
      toast.error('Failed to load vehicle documents');
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Refetch when search changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAll();
    }, searchTerm ? 500 : 0); // Debounce search by 500ms
    
    return () => clearTimeout(timeoutId);
    // fetchAll is stable and doesn't need to be in deps as it uses state values directly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const documentTypes = [
    { key: 'registration', label: 'Registration Certificate (RC)', required: true },
    { key: 'insurance', label: 'Insurance Policy', required: true },
    { key: 'puc', label: 'Pollution Under Control (PUC)', required: true },
    { key: 'permit', label: 'Commercial Permit', required: true },
    // { key: 'fitness', label: 'Fitness Certificate', required: true }
  ];

  const documentFieldMap = {
    registration: 'registrationDate',
    insurance: 'insuranceDate',
    puc: 'emissionDate',
    permit: 'permitDate'
  };

  const openEdit = (vehicle, docKey) => {
    setEditingDoc({
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      docKey,
      currentDate: vehicle.documents[docKey]?.expiryDate || ''
    });
  };

  const saveEdit = async () => {
    if (!editingDoc) return;
    const field = documentFieldMap[editingDoc.docKey];
    if (!field) return;
    try {
      const res = await fetch(`${API_BASE}/api/vehicles/${editingDoc.vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: editingDoc.currentDate })
      });
      if (!res.ok) throw new Error(`Failed to update ${editingDoc.docKey}`);
      const updated = await res.json();
      setVehicleDocuments(prev => prev.map(v => {
        if (v.id === editingDoc.vehicleId) {
          return {
            ...v,
            documents: {
              ...v.documents,
              [editingDoc.docKey]: {
                ...v.documents[editingDoc.docKey],
                expiryDate: updated[field] || editingDoc.currentDate,
                status: 'verified'
              }
            }
          };
        }
        return v;
      }));
      toast.success('Date updated');
      setEditingDoc(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update');
    }
  };

  const openView = (vehicle, docKey) => {
    setViewDoc({
      vehicleNumber: vehicle.vehicleNumber,
      driverName: vehicle.driverName,
      docKey,
      doc: vehicle.documents[docKey]
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return <Badge variant="success" className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge variant="warning" className="flex items-center"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'expired':
        return <Badge variant="danger" className="flex items-center"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      case 'expiring':
        return <Badge variant="warning" className="flex items-center"><AlertTriangle className="h-3 w-3 mr-1" />Expiring Soon</Badge>;
      case 'rejected':
        return <Badge variant="danger" className="flex items-center"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const isDocumentExpiring = (expiryDate) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isDocumentExpired = (expiryDate) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const getDocumentStatus = (document) => {
    // handle missing document object
    if (!document) return 'pending';
    // if expiry not provided, fall back to explicit status or pending
    if (!document.expiryDate) return document.status || 'pending';
    if (isDocumentExpired(document.expiryDate)) return 'expired';
    if (isDocumentExpiring(document.expiryDate)) return 'expiring';
    return document.status || 'verified';
  };

  // Server-side search is now used via API, so we only filter by status client-side
  // Status filtering remains client-side since it's based on computed document expiry statuses
  const filteredVehicles = vehicleDocuments.filter(vehicle => {
    if (statusFilter === 'all') return true;
    
    const hasMatchingStatus = Object.values(vehicle.documents).some(doc => 
      getDocumentStatus(doc) === statusFilter
    );
    
    return hasMatchingStatus;
  });

  const handleDocumentAction = (vehicleId, docType, action) => {
    setVehicleDocuments(prev => prev.map(vehicle => {
      if (vehicle.id === vehicleId) {
        const newStatus = action === 'approve' ? 'verified' : 'rejected';
        return {
          ...vehicle,
          documents: {
            ...vehicle.documents,
            [docType]: {
              ...vehicle.documents[docType],
              status: newStatus
            }
          }
        };
      }
      return vehicle;
    }));
    
    toast.success(`Document ${action}d successfully`);
  };

  const getAlertCounts = () => {
    let expiring = 0;
    let expired = 0;
    let pending = 0;

    vehicleDocuments.forEach(vehicle => {
      Object.values(vehicle.documents).forEach(doc => {
        const status = getDocumentStatus(doc);
        if (status === 'expiring') expiring++;
        if (status === 'expired') expired++;
        if (status === 'pending') pending++;
      });
    });

    return { expiring, expired, pending };
  };

  const alertCounts = getAlertCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Documents</h1>
          <p className="text-gray-600">Manage vehicle documents and track expiry dates</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <PermissionGuard permission={PERMISSIONS.REPORTS_EXPORT}>
            <button className="btn btn-secondary flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expired Documents</p>
                <p className="text-2xl font-bold text-red-600">{alertCounts.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">{alertCounts.expiring}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-blue-600">{alertCounts.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-bold text-gray-900">{vehicleDocuments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative w-full max-w-md">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
  <input
    type="text"
    placeholder="Search by vehicle or driver..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
  />
</div>

            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="expiring">Expiring Soon</option>
                <option value="expired">Expired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
              <select
                value={documentTypeFilter}
                onChange={(e) => setDocumentTypeFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Documents</option>
                {documentTypes.map(docType => (
                  <option key={docType.key} value={docType.key}>{docType.label}</option>
                ))}
              </select>
            </div> */}

            {/* <div className="flex items-end">
              <button className="btn btn-outline w-full">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </button>
            </div> */}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Documents ({filteredVehicles.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Insurance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PUC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permit
                  </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fitness
                  </th> */}
                  {/* <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th> */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Car className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{vehicle.vehicleNumber}</div>
                          <div className="text-sm text-gray-500">{vehicle.vehicleType}</div>
                          <div className="text-sm text-gray-500">
                            Driver: {vehicle.driverName}
                            {vehicle.driverMobile && <span className="ml-2 text-gray-400">({vehicle.driverMobile})</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {documentTypes.map(docType => (
                      <td key={docType.key} className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getStatusBadge(getDocumentStatus(vehicle.documents[docType.key]))}
                          <div className="text-xs text-gray-500">
                            Expires: {formatDate(vehicle.documents[docType.key].expiryDate)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-600">
                            <button
                              type="button"
                              className="hover:text-blue-800 flex items-center gap-1"
                              onClick={() => openView(vehicle, docType.key)}
                            >
                              <Eye className="h-4 w-4" /> View
                            </button>
                            {hasPermission(PERMISSIONS.VEHICLES_EDIT) && (
                              <button
                                type="button"
                                className="hover:text-blue-800 flex items-center gap-1"
                                onClick={() => openEdit(vehicle, docType.key)}
                              >
                                <Upload className="h-4 w-4" /> Edit Date
                              </button>
                            )}
                          </div>
                          {hasPermission(PERMISSIONS.VEHICLES_EDIT) && 
                           vehicle.documents[docType.key].status === 'pending' && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleDocumentAction(vehicle.id, docType.key, 'approve')}
                                className="text-xs text-green-600 hover:text-green-800"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDocumentAction(vehicle.id, docType.key, 'reject')}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    ))}

                    {/* <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Documents"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <PermissionGuard permission={PERMISSIONS.VEHICLES_EDIT}>
                          <button
                            className="text-green-600 hover:text-green-900"
                            title="Upload Documents"
                          >
                            <Upload className="h-4 w-4" />
                          </button>
                        </PermissionGuard>
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          title="Download Documents"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Expiry Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
            Document Expiry Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {vehicleDocuments.map(vehicle => 
              Object.entries(vehicle.documents).map(([docType, doc]) => {
                const status = getDocumentStatus(doc);
                if (status === 'expiring' || status === 'expired') {
                  const docLabel = documentTypes.find(dt => dt.key === docType)?.label;
                  return (
                    <div 
                      key={`${vehicle.id}-${docType}`}
                      className={`p-3 rounded-lg border-l-4 ${
                        status === 'expired' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {vehicle.vehicleNumber} - {docLabel}
                          </p>
                          <p className="text-sm text-gray-600">
                            Driver: {vehicle.driverName}
                            {vehicle.driverMobile && <span className="ml-2">({vehicle.driverMobile})</span>}
                          </p>
                          <p className="text-sm text-gray-600">
                            {status === 'expired' ? 'Expired on' : 'Expires on'}: {formatDate(doc.expiryDate)}
                          </p>
                        </div>
                        <Badge variant={status === 'expired' ? 'danger' : 'warning'}>
                          {status === 'expired' ? 'Expired' : 'Expiring Soon'}
                        </Badge>
                      </div>
                    </div>
                  );
                }
                return null;
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* View modal */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setViewDoc(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">{documentTypes.find(d => d.key === viewDoc.docKey)?.label}</h3>
              <p className="text-sm text-gray-600">Vehicle: {viewDoc.vehicleNumber}</p>
              <p className="text-sm text-gray-600">
                Driver: {viewDoc.driverName}
                {viewDoc.driverMobile && <span className="ml-2">({viewDoc.driverMobile})</span>}
              </p>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-gray-700">Expiry: {formatDate(viewDoc.doc?.expiryDate)}</p>
              <p className="text-sm text-gray-700">Uploaded: {formatDate(viewDoc.doc?.uploadDate)}</p>
              <p className="text-sm text-gray-700">Status: {getDocumentStatus(viewDoc.doc)}</p>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button className="btn btn-secondary" onClick={() => setViewDoc(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit date modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setEditingDoc(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Edit Date</h3>
              <p className="text-sm text-gray-600">{documentTypes.find(d => d.key === editingDoc.docKey)?.label}</p>
              <p className="text-sm text-gray-600">Vehicle: {editingDoc.vehicleNumber}</p>
            </div>
            <div className="p-4 space-y-3">
              <label className="block text-sm font-medium">Expiry Date</label>
              <input
                type="date"
                className="input"
                value={editingDoc.currentDate ? editingDoc.currentDate.slice(0,10) : ''}
                onChange={(e) => setEditingDoc(prev => ({ ...prev, currentDate: e.target.value }))}
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => setEditingDoc(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}