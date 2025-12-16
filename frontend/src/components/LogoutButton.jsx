// Botão de logout
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import { useAuth } from '../contexts/AuthContext';

export default function LogoutButton() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  async function handleLogout() {
    await logout();
    navigate('/login');
  }
  return (
    <Button variant="outline" onClick={handleLogout}>Sair</Button>
  );
}
