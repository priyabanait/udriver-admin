import { useAuth } from '../../contexts/AuthContext';
import SuperAdminDashboard from '../../components/dashboards/SuperAdminDashboard';
import FleetManagerDashboard from '../../components/dashboards/FleetManagerDashboard';
import HRDashboard from '../../components/dashboards/HRDashboard';
import OnboardTeamDashboard from '../../components/dashboards/OnboardTeamDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  // Render different dashboards based on user role
  const renderDashboard = () => {
    switch (user?.role) {
      case 'super_admin':
        return <SuperAdminDashboard />;
      case 'fleet_manager':
        return <FleetManagerDashboard />;
      case 'hr_manager':
        return <HRDashboard />;
      case 'operations_manager':
      case 'support_agent':
      case 'auditor':
      default:
        return <OnboardTeamDashboard />;
    }
  };

  return renderDashboard();
}