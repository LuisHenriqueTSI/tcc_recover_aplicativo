import { useNavigate } from 'react-router-dom';
import Button from './Button';

export default function CancelButton({ to }) {
  const navigate = useNavigate();
  return (
    <Button variant="outline" type="button" onClick={() => (to ? navigate(to) : navigate(-1))}>
      Cancelar
    </Button>
  );
}
