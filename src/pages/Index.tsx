import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/lib/types';
import LoginScreen from '@/components/LoginScreen';
import AdminDashboard from '@/components/AdminDashboard';
import EmployeeDashboard from '@/components/EmployeeDashboard';

const CACHED_PROFILE_KEY = 'cached_profile';
const CACHED_SESSION_KEY = 'cached_session_exists';

function cacheProfile(profile: Profile) {
  localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(CACHED_SESSION_KEY, 'true');
}

function getCachedProfile(): Profile | null {
  try {
    const cached = localStorage.getItem(CACHED_PROFILE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function clearCachedProfile() {
  localStorage.removeItem(CACHED_PROFILE_KEY);
  localStorage.removeItem(CACHED_SESSION_KEY);
}

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          setTimeout(async () => {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (data) {
              const p = data as Profile;
              setProfile(p);
              cacheProfile(p);
            }
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // If offline and has cached session, use cached profile
        if (!navigator.onLine && localStorage.getItem(CACHED_SESSION_KEY)) {
          const cached = getCachedProfile();
          if (cached) {
            setProfile(cached);
            setSession({ offline: true });
          }
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearCachedProfile();
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
