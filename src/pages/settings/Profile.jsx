import { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  const profileFields = useMemo(() => ([
    { label: 'Name', value: user?.name },
    { label: 'Email', value: user?.email },
    { label: 'Role', value: user?.department ? user.department : (user?.role === 'fleet_manager' ? 'Manager' : (user?.role ? user.role.replace('_', ' ') : ''))},
    { label: 'Phone', value: user?.phone || user?.mobile },
   
  ]), [user]);

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">No user information available.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
        <p className="text-gray-600">Your account details</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-4 p-6 border-b border-gray-200">
          <div className="h-14 w-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-semibold">
            {user.name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          {profileFields.map(field => (
            <div key={field.label} className="space-y-1">
              <p className="text-sm text-gray-500">{field.label}</p>
              <p className="text-gray-900 font-medium">
                {field.value || 'Not provided'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
