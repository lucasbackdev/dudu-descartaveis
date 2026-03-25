import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import logo from '@/assets/logo.png';
import { supabase } from '@/integrations/supabase/client';
import { WifiOff } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }

    if (isOffline) {
      setError('Sem conexão com a internet. Conecte-se para fazer login pela primeira vez.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError('Email ou senha incorretos');
      return;
    }

    onLogin();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="Dudu Descartáveis" className="w-48 h-auto" />
          <p className="text-sm text-muted-foreground">Sistema de Gestão de Entregas</p>
        </div>

        {isOffline && (
          <div className="flex items-center gap-3 rounded-2xl p-4 bg-destructive/10 text-destructive border border-destructive/20">
            <WifiOff className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Sem conexão</p>
              <p className="text-xs opacity-80">
                Conecte-se à internet para fazer login. Se já logou antes, seus dados serão carregados automaticamente.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            className="h-12 rounded-full px-5 bg-secondary border-0"
          />
          <Input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            className="h-12 rounded-full px-5 bg-secondary border-0"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <Button onClick={handleLogin} disabled={loading || isOffline} className="w-full h-12 rounded-full text-base font-semibold">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
