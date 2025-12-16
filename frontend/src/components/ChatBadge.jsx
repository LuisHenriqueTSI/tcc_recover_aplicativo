import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ChatBadge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useUnreadMessages();

  return (
    <div className="relative w-10 h-10">
      <button 
        onClick={() => navigate(user ? '/chat' : '/login')}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-surface-dark text-text-secondary-dark hover:bg-white/10 hover:text-white transition-all"
        title="Chat"
      >
        <span className="material-symbols-outlined text-xl">chat_bubble</span>
      </button>
      
      {/* Badge com contador de mensagens não lidas */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full border-2 border-background-dark">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  );
}
