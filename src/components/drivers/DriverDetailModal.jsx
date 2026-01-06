import { useState } from 'react';
import { X, Mail, Phone, FileText, User, MapPin, Car, CreditCard, ZoomIn, Download } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils';

const docUrl = (doc) => {
  if (!doc) return null;
  // Strings (URLs or data URLs)
  if (typeof doc === 'string') return doc;
  // Cloudinary-like objects or other objects with url fields
  if (typeof doc === 'object') {
    return doc.secure_url || doc.url || doc.path || null;
  }
  // File objects
  if (doc instanceof File) return URL.createObjectURL(doc);
  return null;
};

// Resolve a document value for a given key from multiple possible locations
const getDocument = (drv, key) => {
  if (!drv) return null;
  // Direct field
  if (drv[key]) return drv[key];
  // Documents sub-object used in some records
  if (drv.documents && drv.documents[key]) return drv.documents[key];
  // Common alternate property names
  if (drv[`${key}Url`]) return drv[`${key}Url`];
  if (drv[`${key}_url`]) return drv[`${key}_url`];
  if (drv[`${key}Image`]) return drv[`${key}Image`];
  // DriverSignup-style storage
  if (drv.signature && key === 'signature') return drv.signature;
  return null;
};

export default function DriverDetailModal({ isOpen, onClose, driver }) {
  const [fullScreenImage, setFullScreenImage] = useState(null);

  if (!isOpen || !driver) return null;

  const renderDocumentPreview = (doc, label) => {
    if (!doc) return <div className="text-sm text-gray-500 text-center py-8">Not uploaded</div>;

    // Handle string URLs (from backend)
    if (typeof doc === 'string') {
      // Check if it's a PDF
      if (doc.match(/\.(pdf)$/i) || doc.includes('/pdf/') || doc.includes('.pdf')) {
        return (
          <div className="flex flex-col items-center space-y-2">
            <FileText className="h-16 w-16 text-red-500" />
            <a 
              href={doc} 
              target="_blank" 
              rel="noreferrer" 
              className="text-primary-600 hover:underline text-sm font-medium"
            >
              View PDF
            </a>
            <a 
              href={doc} 
              download 
              className="text-gray-600 hover:text-gray-900 text-xs flex items-center"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </a>
          </div>
        );
      }
      
      // Treat everything else as an image (including Cloudinary URLs without extensions)
      // Most documents from Cloudinary are images
      return (
        <div className="relative group cursor-pointer h-full w-full">
          <img 
            src={doc} 
            alt={label || "Document"} 
            className="h-full w-full object-cover rounded-lg transition-transform group-hover:scale-105" 
            onClick={(e) => {
              e.stopPropagation();
              setFullScreenImage({ url: doc, label });
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      );
    }

    // Handle File objects (from file inputs)
    if (doc instanceof File) {
      if (doc.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(doc);
        return (
          <div className="relative group cursor-pointer h-full w-full">
            <img 
              src={previewUrl} 
              alt={label || "Document"} 
              className="h-full w-full object-cover rounded-lg transition-transform group-hover:scale-105"
              onLoad={() => URL.revokeObjectURL(previewUrl)}
              onClick={(e) => {
                e.stopPropagation();
                setFullScreenImage({ url: previewUrl, label });
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
              <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        );
      }
      return <div className="text-sm text-gray-600 text-center py-8">{doc.name}</div>;
    }

    return <div className="text-sm text-gray-500 text-center py-8">Invalid document</div>;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-primary-100 rounded-full overflow-hidden flex items-center justify-center">
                {docUrl(driver.profilePhoto) ? (
                  <img src={driver.profilePhoto} alt={driver.name} className="h-12 w-12 object-cover" />
                ) : (
                  <span className="text-lg font-medium text-primary-700">
                    {driver.name?.split(' ').map(n => n[0]).join('')}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{driver.name}</h2>
                <p className="text-sm text-gray-600">License: {driver.licenseNumber || '—'}</p>
                <p className="text-sm text-gray-500 mt-1">Driver No: {driver.driverNo || '—'}{driver.udbId ? (<span className="ml-3">• UDB ID: <span className="font-medium">{driver.udbId}</span></span>) : null}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Basic info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="card">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <div className="mt-1 flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{driver.name}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <div className="mt-1 flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{driver.email}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <div className="mt-1 flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
  {driver.phone || driver.driverNo || '—'}
</span>

                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Alternate No</label>
                        <div className="mt-1 flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{driver.alternateNo || '—'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                        <div className="mt-1 text-sm text-gray-900">{driver.dateOfBirth ? formatDate(driver.dateOfBirth) : '—'}</div>
                      </div>
                      <div className="md:col-span-2">
  <label className="block text-sm font-medium text-gray-700">UDB ID</label>
  <div className="mt-1 flex items-start">
    <span className="text-sm text-gray-900">
      {driver.udbId || driver.employeeId || '—'}
    </span>
  </div>
</div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <div className="mt-1 flex items-start">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                          <span className="text-sm text-gray-900 whitespace-pre-line">{driver.address}</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">City</label>
                        <div className="mt-1 text-sm text-gray-900">{driver.city || '—'}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">State</label>
                        <div className="mt-1 text-sm text-gray-900">{driver.state || '—'}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Pincode</label>
                        <div className="mt-1 text-sm text-gray-900">{driver.pincode || '—'}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">GPS Coordinates</label>
                        <div className="mt-1 text-sm text-gray-900">
                          {driver.latitude && driver.longitude 
                            ? `${parseFloat(driver.latitude).toFixed(6)}, ${parseFloat(driver.longitude).toFixed(6)}`
                            : '—'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
                        <div className="mt-1 text-sm text-gray-900">{driver.emergencyContact || '—'}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Emergency Phone</label>
                        <div className="mt-1 flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{driver.emergencyPhone || '—'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Join Date</label>
                        <div className="mt-1 text-sm text-gray-900">{formatDate(driver.joinDate)}</div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Deposit</label>
                        <div className="mt-1 text-sm text-gray-900">{driver.deposit !== undefined && driver.deposit !== null ? formatCurrency(driver.deposit) : '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">License & Documents Info</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">License Number</label>
                        <div className="mt-1 text-sm font-mono text-gray-900">{driver.licenseNumber || '—'}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">License Class</label>
                        <div className="mt-1 text-sm text-gray-900">{driver.licenseClass || '—'}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">License Expiry Date</label>
                        <div className="mt-1 text-sm text-gray-900">{driver.licenseExpiryDate ? formatDate(driver.licenseExpiryDate) : '—'}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Aadhar Number</label>
                        <div className="mt-1 text-sm font-mono text-gray-900">{driver.aadharNumber || '—'}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">PAN Number</label>
                        <div className="mt-1 text-sm font-mono text-gray-900">{driver.panNumber || '—'}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Electric Bill No.</label>
                        <div className="mt-1 text-sm text-gray-900">{driver.electricBillNo || '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Professional</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Driving Experience</label>
                        <div className="mt-1 text-sm text-gray-900">{driver.experience || '—'}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Plan</label>
                        <div className="mt-1 flex items-center">
                          <Car className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{driver.planType || driver.currentPlan || '—'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Vehicle Preference</label>
                        <div className="mt-1 text-sm text-gray-900">{driver.vehiclePreference || driver.vehicleAssigned || '—'}</div>
                      </div>
                     
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">KYC Status</label>
                        <div className="mt-1 text-sm text-gray-900">{driver.kycStatus || '—'}</div>
                      </div>
                    
                      {driver.previousEmployment && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Previous Employment</label>
                          <div className="mt-1 text-sm text-gray-900 whitespace-pre-line">{driver.previousEmployment}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank Details - Right Column */}
              <div className="space-y-6">
                <div className="card">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Details</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-600">Bank Name</span>
                        <div className="mt-1 font-medium text-gray-900">{driver.bankName || '—'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Branch Name</span>
                        <div className="mt-1 font-medium text-gray-900">{driver.accountBranchName || '—'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Account Number</span>
                        <div className="mt-1 font-mono text-gray-900">{driver.accountNumber || '—'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">IFSC Code</span>
                        <div className="mt-1 font-mono text-gray-900">{driver.ifscCode || '—'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Account Holder</span>
                        <div className="mt-1 font-medium text-gray-900">{driver.accountHolderName || '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Section - Full Width Horizontal */}
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-500" />
                  Documents
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { key: 'profilePhoto', label: 'Profile Photo', number: null },
                    { key: 'signature', label: 'Signature', number: null },
                    { key: 'licenseDocument', label: 'License Document', number: driver.licenseNumber },
                    { key: 'aadharDocument', label: 'Aadhar Front', number: driver.aadharNumber },
                    { key: 'aadharDocumentBack', label: 'Aadhar Back', number: driver.aadharNumber },
                    { key: 'panDocument', label: 'PAN Card', number: driver.panNumber },
                    { key: 'bankDocument', label: 'Bank Document', number: driver.accountNumber },
                    { key: 'electricBillDocument', label: 'Electric Bill', number: driver.electricBillNo },
                  ].map(({ key, label, number }) => {
                    const doc = getDocument(driver, key);
                    return (
                      <div key={key} className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-gray-50 px-3 py-2 border-b">
                          <div className="text-xs font-medium text-gray-700 truncate" title={label}>
                            {label}
                          </div>
                          {number && (
                            <div className="text-xs text-gray-500 font-mono truncate mt-1" title={number}>
                              {number}
                            </div>
                          )}
                        </div>
                        <div className="aspect-square flex items-center justify-center bg-gray-50 p-2">
                          {renderDocumentPreview(doc, label)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Screen Image Viewer */}
        {fullScreenImage && (
          <div 
            className="fixed inset-0 z-[60] bg-black bg-opacity-95 flex items-center justify-center p-4"
            onClick={() => setFullScreenImage(null)}
          >
            <button
              onClick={() => setFullScreenImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            >
              <X className="h-8 w-8" />
            </button>
            
            <div className="relative max-w-6xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center">
              {fullScreenImage.label && (
                <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white px-6 py-3 text-center">
                  <h3 className="text-lg font-medium">{fullScreenImage.label}</h3>
                </div>
              )}
              
              <img
                src={fullScreenImage.url}
                alt={fullScreenImage.label || "Document"}
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 px-6 py-3 flex justify-center space-x-4">
                <a
                  href={fullScreenImage.url}
                  download
                  className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </a>
                <a
                  href={fullScreenImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ZoomIn className="h-4 w-4" />
                  <span>Open in New Tab</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

