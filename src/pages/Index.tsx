import { useState } from 'react';
import LoginScreen from '@/components/LoginScreen';
import AdminDashboard from '@/components/AdminDashboard';
import EmployeeDashboard from '@/components/EmployeeDashboard';

const Index = () => {
  const [role, setRole] = useState<'admin' | 'employee' | null>(null);

  if (!role) {
    return <LoginScreen onLogin={setRole} />;
  }

  if (role === 'admin') {
    return <AdminDashboard onLogout={() => setRole(null)} />;
  }

  return <EmployeeDashboard onLogout={() => setRole(null)} />;
};

export default Index;
