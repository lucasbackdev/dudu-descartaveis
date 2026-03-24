import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/lib/types';
import LoginScreen from '@/components/LoginScreen';
import AdminDashboard from '@/components/AdminDashboard';
import EmployeeDashboard from '@/components/EmployeeDashboard';

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          // Fetch profile with setTimeout to avoid race condition with trigger
          setTimeout(async () => {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            setProfile(data as Profile | null);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginScreen onLogin={() => {}} />;
  }

  if (profile.role === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return <EmployeeDashboard profile={profile} onLogout={handleLogout} />;
};

export default Index;
