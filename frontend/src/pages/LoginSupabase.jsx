import SimpleSidebar from '../components/SimpleSidebar';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { signIn } from '../services/supabaseAuth';
import { useAuth } from '../contexts/AuthContext';

export default function LoginSupabase() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();
  

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error } = await signIn(email, password);
    console.debug('[LoginSupabase] signIn result:', { data, error });
    
    if (error) {
      // error can be an Error object or have a message property
      const errorMessage = error.message || error.toString();
      setError(errorMessage);
    } else if (data?.session) {
      // Login successful - user is authenticated with Supabase
      const supabaseUser = data.user || null;
      console.debug('[LoginSupabase] logged in user:', supabaseUser);
      try {
        await login(supabaseUser);
        navigate('/');
      } catch (e) {
        console.debug('[Login] login helper failed', e);
        setError('Falha ao autenticar. Tente novamente.');
      }
    } else {
      setError('Login falhou. Verifique suas credenciais.');
    }
    setLoading(false);
  }

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Se já está logado, redireciona para home
  if (user) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen bg-background-dark">
      <SimpleSidebar onCollapseChange={setSidebarCollapsed} />
      <div className={`flex items-center justify-center p-4 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
        <div className="max-w-md w-full bg-surface-dark rounded-xl p-8 border border-white/10 animate-fade-in">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">🔐 Entrar</h2>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-text-primary-dark mb-2">Email</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="form-input px-4 py-2 rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/10 bg-surface-dark h-11 placeholder:text-text-secondary-dark text-sm font-normal"
              placeholder="seu@email.com"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-text-primary-dark mb-2">Senha</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="form-input px-4 py-2 rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/10 bg-surface-dark h-11 placeholder:text-text-secondary-dark text-sm font-normal"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white font-semibold transition-colors mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
                Entrando...
              </span>
            ) : '✅ Login'}
          </button>
        </form>
        {error && (
          <div className="mt-4 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm text-center font-semibold" role="alert">
            {error}
          </div>
        )}
        <div className="mt-6 text-center text-text-secondary-dark text-sm">
          Não tem conta? <button onClick={() => navigate('/register')} className="text-primary hover:text-primary/80 font-semibold transition">Criar conta</button>
        </div>
        </div>
      </div>
    </div>
  );
}
