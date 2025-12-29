import React from 'react';
import DriverWalletMessages from './pages/drivers/DriverWalletMessages';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import Dashboard from './pages/dashboard/Dashboard';
import DriversList from './pages/drivers/DriversList';
import DriverStatus from './pages/drivers/DriverStatus';
import DriverPerformance from './pages/drivers/DriverPerformance';
import DriverPayments from './pages/drivers/DriverPayments';
import DriverLogin from './pages/drivers/DriverLogin';
import DriverPlanSelection from './pages/drivers/DriverPlanSelection';
import DriverMyPlans from './pages/drivers/DriverMyPlans';
import VehicleDocuments from './pages/vehicles/VehicleDocuments';
import InvestmentManagement from './pages/investments/InvestmentManagement';
import Investors from './pages/investments/Investors';
import InvesterLogin from './pages/investments/InvesterLogin';
import InvestorPlanSelection from './pages/investments/InvestorPlanSelection';
import PaymentManagement from './pages/payments/DriverPayments';
import PaymentProcess from './pages/payments/PaymentProcess';
import ExpenseManagement from './pages/expenses/ExpenseManagement';
import ExpenseReports from './pages/expenses/ExpenseReports';
import ExpenseCategories from './pages/expenses/ExpenseCategories';
import FinancialReports from './pages/reports/FinancialReports';
import PerformanceReports from './pages/reports/PerformanceReports';
import CarPlans from './pages/plans/CarPlans';
import DriverEnrollments from './pages/plans/DriverEnrollments';
import DriverPlanSelections from './pages/plans/DriverPlanSelections';
import AdminUsers from './pages/admin/AdminUsers';
import RoleManagement from './pages/admin/RoleManagement';
import SignupCredentials from './pages/admin/SignupCredentials';
import AllVehicles from './pages/vehicles/AllVehicles';
import DriverWallet from './pages/drivers/DriverWallet';
import InvestorWallet from './pages/investors/InvestorWallet';
import InvestmentWalletMessages from './pages/investors/InvestmentWalletMessages';
import ManagerPage from './pages/manager/ManagerPage';
import InvestorCar from './pages/investments/InvestmentCar';
import InvesterDetails from './components/investors/InvesterDetails.jsx';
import Profile from './pages/settings/Profile';
import StaffAttendence from './pages/drivers/StaffAttendence.jsx';
import PrivacyPolicy from './pages/drivers/Privacypolicy.jsx';
import Notification from './components/notification/Notification.jsx';


// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">{this.state.error?.message || 'An error occurred'}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Public Route Component (redirects to dashboard if already logged in)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public standalone Driver Login (not redirected even if authenticated) */}
       <Route path="privacypolicy" element={<PrivacyPolicy />} />
      <Route path="/drivers/login" element={<DriverLogin />} />
      <Route path="/drivers/select-plan" element={<DriverPlanSelection />} />
      <Route path="/drivers/my-plans" element={<DriverMyPlans />} />

    {/* Public Investor routes */}
      <Route path="/investors/login" element={<InvesterLogin />} />
      <Route path="/investors/select-plan" element={<InvestorPlanSelection />} />
      
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/forgot-password" element={
        <PublicRoute>
          <ForgotPassword />
        </PublicRoute>
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="drivers" element={<DriversList />} />
        <Route path="drivers/status" element={<DriverStatus />} />
        <Route path="drivers/performance" element={<DriverPerformance />} />
        <Route path="drivers/payments" element={<DriverPayments />} />
  {/* Removed DriverLogin from protected nested routes to avoid dashboard layout */}
        <Route path="vehicles/documents" element={<VehicleDocuments />} />
        <Route path="investments" element={<InvestmentManagement />} />
        <Route path="investments/investors" element={<Investors />} />
        <Route path="payments/drivers" element={<PaymentManagement />} />
        <Route path="payments/driverpayments" element={<PaymentManagement />} />
        <Route path="payments/process" element={<PaymentProcess />} />
        <Route path="expenses" element={<ExpenseManagement />} />
        <Route path="expenses/reports" element={<ExpenseReports />} />
        <Route path="expenses/categories" element={<ExpenseCategories />} />
        <Route path="reports/financial" element={<FinancialReports />} />
        <Route path="reports/performance" element={<PerformanceReports />} />
        <Route path="plans" element={<CarPlans />} />
        <Route path="plans/enrollments" element={<DriverEnrollments />} />
        <Route path="plans/selections" element={<DriverPlanSelections />} />
        <Route path="admin/users" element={<AdminUsers />} />
        <Route path="admin/roles" element={<RoleManagement />} />
        <Route path="admin/signup-credentials" element={<SignupCredentials />} />
        <Route path="vehicles/allvehicles" element={<AllVehicles />} />
          <Route path="investments/InvesterLogin" element={<InvesterLogin />} />
                <Route path="/drivers/wallet" element={<DriverWallet />}/>
                <Route path="/drivers/wallet-messages" element={<DriverWalletMessages />} />
                      <Route path="/investments/wallet" element={<InvestorWallet />} />
                      <Route path="/investments/wallet-messages" element={<InvestmentWalletMessages />} />
                       <Route path="/investments/car" element={<InvestorCar />} />
            <Route path="staff" element={<ManagerPage />} />
            <Route path="investerDetails" element={<InvesterDetails />} />
            <Route path="settings" element={<Profile />} />
                <Route path="attendence" element={
                 
                    <StaffAttendence />
                
                } />
                <Route path="notification" element={<Notification />} /> 
                 
        {/* Add more routes as we create them */}
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
              },
            }}
          />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
