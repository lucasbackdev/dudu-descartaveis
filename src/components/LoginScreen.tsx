import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (role: 'admin' | 'employee') => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (username === 'admin123' && password === 'admin123') {
      onLogin('admin');
    } else if (username && password) {
      onLogin('employee');
    } else {
      setError('Preencha todos os campos');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <Package className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dudu Descartáveis</h1>
          <p className="text-sm text-muted-foreground">Sistema de Gestão de Entregas</p>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="Usuário"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
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
          <Button onClick={handleLogin} className="w-full h-12 rounded-full text-base font-semibold">
            Entrar
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Demo: admin123 / admin123 (admin) ou qualquer login (funcionário)
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
