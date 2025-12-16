import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></span>
      <span className="ml-2 text-primary">Carregando...</span>
    </div>
  );
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
