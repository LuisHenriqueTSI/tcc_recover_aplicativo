import SimpleSidebar from '../components/SimpleSidebar';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUp, signIn, resendConfirmation } from '../services/supabaseAuth';
import { supabase } from '../supabaseClient';

export default function RegisterSupabase() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [offerResend, setOfferResend] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setOfferResend(false);

    if (!name || name.trim() === '') {
      setError('Por favor, informe seu nome');
      setLoading(false);
      return;
    }

    console.log('[RegisterSupabase] Iniciando registro para:', email);

    try {
      const res = await signUp(email, password, name);
      
      if (res?.error) {
        console.error('[RegisterSupabase] Erro no signup:', res.error);
        const msg = res.error.message || 'Erro ao registrar';
        setError(msg);
        // Se for erro de envio de email, oferecer reenvio
        if (msg?.toLowerCase().includes('error sending confirmation email')) {
          setOfferResend(true);
        }
        setLoading(false);
        return;
      }

      console.log('[RegisterSupabase] Registro bem-sucedido:', res);

      // Verificar se precisa confirmar email
      const needsEmailConfirmation = res?.data?.user && !res?.data?.session;

      if (needsEmailConfirmation) {
        // Usuário precisa confirmar email
        setSuccess('Conta criada com sucesso! Verifique seu email para confirmar sua conta.');
        setLoading(false);

        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Verifique seu email para confirmar sua conta antes de fazer login.' 
            } 
          });
        }, 3000);
      } else {
        // Conta criada e já pode fazer login
        setSuccess('Conta criada com sucesso! Redirecionando...');
        setLoading(false);

        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Conta criada com sucesso! Faça login para continuar.' 
            } 
          });
        }, 2000);
      }

    } catch (error) {
      console.error('[RegisterSupabase] Exceção durante registro:', error);
      setError(error.message || 'Erro ao registrar. Tente novamente.');
      setLoading(false);
    }
  }

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background-dark">
      <SimpleSidebar onCollapseChange={setSidebarCollapsed} />
      <div className={`flex items-center justify-center p-4 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
        <div className="max-w-md w-full bg-surface-dark rounded-xl p-8 border border-white/10">
        <h2 className="text-3xl font-bold mb-6 text-white text-center">📝 Registrar Usuário</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-text-primary-dark mb-2">Nome</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="form-input px-4 py-2 rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/10 bg-surface-dark h-11 placeholder:text-text-secondary-dark text-sm font-normal"
              placeholder="Seu nome"
            />
          </div>
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
          <div className="flex gap-2 mt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white font-semibold transition-colors"
            >
              {loading ? '📧 Enviando email de confirmação...' : '✅ Registrar'}
            </button>
            <button 
              type="button"
              onClick={() => navigate('/login')}
              className="flex-1 px-6 py-3 rounded-lg bg-surface-dark/60 hover:bg-surface-dark border border-white/10 hover:border-white/20 text-text-primary-dark font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
        {success && (
          <div className="mt-4 text-green-200 text-sm text-center bg-green-500/20 border border-green-500/50 rounded-lg p-4 font-semibold">
            ✅ {success}
            <div className="text-xs font-normal mt-2">Redirecionando para login...</div>
          </div>
        )}
        {error && (
          <div className="mt-4 text-red-400 text-sm text-center bg-red-500/20 border border-red-500/50 rounded-lg p-3 font-semibold">
            {error}
            {offerResend && (
              <div className="mt-3 flex justify-center">
                <button
                  onClick={async () => {
                    setLoading(true);
                    const r = await resendConfirmation(email);
                    setLoading(false);
                    if (r?.error) {
                      setError(r.error.message || 'Falha ao reenviar. Verifique configurações de email no Supabase.');
                    } else {
                      setSuccess('Email de confirmação reenviado! Verifique sua caixa de entrada.');
                      setError('');
                      setOfferResend(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold"
                >
                  Reenviar email de confirmação
                </button>
              </div>
            )}
          </div>
        )}
        <div className="mt-6 text-center text-text-secondary-dark text-sm">
          Já tem conta? <button onClick={() => navigate('/login')} className="text-primary hover:text-primary/80 font-semibold transition">Entrar</button>
        </div>
        </div>
      </div>
    </div>
  );
}
