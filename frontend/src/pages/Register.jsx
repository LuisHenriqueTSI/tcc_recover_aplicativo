import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUp } from '../services/supabaseAuth';
import Card from '../components/Card';
import Button from '../components/Button';
import CancelButton from '../components/CancelButton';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await signUp(email, password, name);
      if (res.data?.user) {
        navigate('/login');
      } else {
        setError(res.error?.message || 'Erro ao registrar');
      }
    } catch (err) {
      setError(err.message || 'Erro ao registrar');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-light p-4">
      <Card className="max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-primary">Registrar Usuário</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Nome"
            value={name}
            onChange={e => setName(e.target.value)}
            className="border p-2 rounded"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border p-2 rounded"
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border p-2 rounded"
            required
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-2">
            <Button variant="primary" type="submit">Registrar</Button>
            <CancelButton />
          </div>
        </form>
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => navigate('/login')}>Já tenho conta</Button>
        </div>
      </Card>
    </div>
  );
}
