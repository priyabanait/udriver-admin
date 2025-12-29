import { useAuth } from '../../contexts/AuthContext';
import SuperAdminDashboard from '../../components/dashboards/SuperAdminDashboard';
import FleetManagerDashboard from '../../components/dashboards/FleetManagerDashboard';
import FinanceAdminDashboard from '../../components/dashboards/FinanceAdminDashboard';
import DefaultDashboard from '../../components/dashboards/DefaultDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  // Render different dashboards based on user role
  const renderDashboard = () => {
    switch (user?.role) {
      case 'super_admin':
        return <DefaultDashboard />;
      case 'fleet_manager':
        return <FleetManagerDashboard />;
      case 'finance_admin':
        return <FinanceAdminDashboard />;
      case 'hr_manager':
      case 'operations_manager':
      case 'support_agent':
      case 'auditor':
      default:
        return <DefaultDashboard />;
    }
  };

  return renderDashboard();
}