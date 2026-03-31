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

function restoreCachedProfile() {
  if (!localStorage.getItem(CACHED_SESSION_KEY)) return null;
  return getCachedProfile();
}

const APP_LOCKED = true; // SET TO false TO UNLOCK ACCESS

const Index = () => {
  const initialCachedProfile = restoreCachedProfile();
  const [session, setSession] = useState<any>(initialCachedProfile ? { offline: true } : null);
  const [profile, setProfile] = useState<Profile | null>(initialCachedProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (APP_LOCKED) {
      setLoading(false);
      return;
    }

    let active = true;

    const applyCachedSession = () => {
      const cachedProfile = restoreCachedProfile();
      if (!cachedProfile || !active) return false;
      setProfile(cachedProfile);
      setSession((current: any) => current ?? { offline: true });
      return true;
    };

    const loadProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!active) return;

      if (data) {
        const nextProfile = data as Profile;
        setProfile(nextProfile);
        cacheProfile(nextProfile);
      } else if (!applyCachedSession()) {
        setProfile(null);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;

      if (nextSession?.user) {
        setSession(nextSession);
        setTimeout(() => {
          loadProfile(nextSession.user.id).finally(() => {
            if (active) setLoading(false);
          });
        }, 0);
        return;
      }

      if (event === 'SIGNED_OUT') {
        clearCachedProfile();
        setProfile(null);
        setSession(null);
        setLoading(false);
        return;
      }

      if (!navigator.onLine && applyCachedSession()) {
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;

      if (session?.user) {
        setSession(session);
        loadProfile(session.user.id).finally(() => {
          if (active) setLoading(false);
        });
        return;
      }

      if (!applyCachedSession()) {
        setProfile(null);
        setSession(null);
      }

      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearCachedProfile();
    setProfile(null);
    setSession(null);
  };

  if (APP_LOCKED) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">Sistema em Manutenção</h1>
          <p className="text-sm text-muted-foreground">
            O acesso ao sistema está temporariamente suspenso. Entre em contato com o administrador para mais informações.
          </p>
        </div>
      </div>
    );
  }

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
