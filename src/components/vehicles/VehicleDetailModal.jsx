import { X } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils';

export default function VehicleDetailModal({ isOpen, onClose, vehicle = null, drivers = [], managers = [] }) {
  if (!isOpen) return null;

  const v = vehicle || {};

  const getDriverName = () => {
    if (!v.assignedDriver) return '-';
    const found = drivers.find(d => d._id === v.assignedDriver);
    return found ? (found.name || found.username || found.phone) : v.assignedDriver;
  };

  const getManagerName = () => {
    if (!v.assignedManager) return '-';
    const found = managers.find(m => m._id === v.assignedManager);
    return found ? (found.name || found.username || found.email) : v.assignedManager;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-medium">Vehicle Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5"/></button>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start with: Category, Brand, Model Name, Car Name, Color, Fuel Type */}
              <div>
                <p className="text-sm text-gray-500">Car Category</p>
                <p className="font-medium">{v.category || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Brand</p>
                <p className="font-medium">{v.brand || v.make || '-'}</p>
              </div>

              {/* <div>
                <p className="text-sm text-gray-500">Model Name</p>
                <p className="font-medium">{v.model || '-'}</p>
              </div> */}
              <div>
                <p className="text-sm text-gray-500">Car Name</p>
                <p className="font-medium">{v.carName || v.name || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Color</p>
                <p className="font-medium">{v.color || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fuel Type</p>
                <p className="font-medium">{v.fuelType || '-'}</p>
              </div>

              {/* then rest of key info */}
              <div>
                <p className="text-sm text-gray-500">Registration Number</p>
                <p className="font-medium">{v.registrationNumber || v.regNo || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Owner Name</p>
                <p className="font-medium">{v.ownerName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Owner Phone</p>
                <p className="font-medium">{v.ownerPhone || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Manufacture Year</p>
                <p className="font-medium">{v.manufactureYear || v.year || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Registration Date</p>
                <p className="font-medium">{formatDate(v.registrationDate)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Insurance Expiry Date</p>
                <p className="font-medium">{formatDate(v.insuranceExpiryDate || v.insuranceExpiry || v.insuranceDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">FC Expiry Date</p>
                <p className="font-medium">{formatDate(v.rcExpiryDate || v.rcExpiry)}</p>
              </div>

              {/* <div>
                <p className="text-sm text-gray-500">Fitness Expiry</p>
                <p className="font-medium">{formatDate(v.fitnessExpiryDate || v.fitnessExpiry)}</p>
              </div> */}
              <div>
                <p className="text-sm text-gray-500">Road Tax Date</p>
                <p className="font-medium">{formatDate(v.roadTaxDate)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Road Tax No.</p>
                <p className="font-medium">{v.roadTaxNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">PUC No.</p>
                <p className="font-medium">{v.pucNumber || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Permit Expiry Date</p>
                <p className="font-medium">{formatDate(v.permitDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Car Submit Date</p>
                <p className="font-medium">{formatDate(v.emissionDate)}</p>
              </div>

             
              <div>
                <p className="text-sm text-gray-500">Assigned Driver</p>
                <p className="font-medium">{getDriverName()}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Assigned Manager</p>
                <p className="font-medium">{getManagerName()}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">KYC Status</p>
                <p className="font-medium">{(v.kycStatus || v.kyc || 'pending')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Car Status</p>
                <p className="font-medium">{v.status || 'inactive'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Driver Agreement</p>
                <p className="font-medium">{v.driverAgreementType ? (v.driverAgreementType.charAt(0).toUpperCase()+v.driverAgreementType.slice(1)) : '-'}</p>
              </div>

              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Remarks</p>
                <p className="font-medium">{v.remarks || '-'}</p>
              </div>
            </div>

            {/* Documents section */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Registration Card', url: v.registrationCardPhoto || v.rcDoc },
                  { label: 'Permit', url: v.permitPhoto || v.permitDoc },
                  { label: 'PUC', url: v.pucPhoto || v.pollutionDoc },
                  { label: 'Road Tax', url: v.roadTaxPhoto },
                  { label: 'Insurance', url: v.insuranceDoc },
                  { label: 'FC Photo', url: v.fcPhoto },
                  { label: 'Fitness', url: v.fitnessDoc }
                ].map((d, i) => (
                  <div key={i} className="border rounded p-2">
                    <p className="text-xs text-gray-500 mb-1">{d.label}</p>
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noreferrer">
                        <img src={d.url} alt={d.label} className="h-28 w-full object-cover rounded" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                        <span className="text-xs text-blue-600 underline mt-1 inline-block">Open</span>
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">Not provided</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicle Photos */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Vehicle Photos</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Front', url: v.carFrontPhoto },
                  { label: 'Left', url: v.carLeftPhoto },
                  { label: 'Right', url: v.carRightPhoto },
                  { label: 'Back', url: v.carBackPhoto },
                  { label: 'Full', url: v.carFullPhoto }
                ].map((d, i) => (
                  <div key={i} className="border rounded p-2">
                    <p className="text-xs text-gray-500 mb-1">{d.label}</p>
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noreferrer">
                        <img src={d.url} alt={d.label} className="h-28 w-full object-cover rounded" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                        <span className="text-xs text-blue-600 underline mt-1 inline-block">Open</span>
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">Not provided</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Additional Photos</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Insurance Photo', url: v.insurancePhoto },
                  { label: 'Interior Photo', url: v.interiorPhoto },
                  { label: 'Speedometer Photo', url: v.speedometerPhoto }
                ].map((d, i) => (
                  <div key={i} className="border rounded p-2">
                    <p className="text-xs text-gray-500 mb-1">{d.label}</p>
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noreferrer">
                        <img src={d.url} alt={d.label} className="h-28 w-full object-cover rounded" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                        <span className="text-xs text-blue-600 underline mt-1 inline-block">Open</span>
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">Not provided</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end p-4 border-t">
            <button onClick={onClose} className="btn btn-primary">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
