import { supabase } from '../supabaseClient';

// Serviço para obter dados do usuário autenticado
export async function getUser() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.debug('[getUser] auth error:', authError?.message);
      // Token inválido ou expirado - não está autenticado
      await supabase.auth.signOut();
      return null;
    }
    
    if (!user) {
      console.debug('[getUser] no authenticated user');
      return null;
    }

    // Buscar informações adicionais do perfil
    let profile = null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        // Check if account is deleted
        if (data.status === 'deleted') {
          console.warn('[getUser] User account is marked as deleted:', user.id);
          await supabase.auth.signOut();
          throw new Error('Não existe essa conta');
        }
        profile = data;
      } else if (error) {
        console.debug('[getUser] profile not found or error:', error?.message);
      }
    } catch (profileError) {
      if (profileError.message?.includes('Não existe')) {
        throw profileError; // Re-throw deletion error
      }
      console.debug('[getUser] error fetching profile:', profileError);
    }
    
    const userData = {
      id: user.id,
      email: user.email,
      name: profile?.name || user.email?.split('@')[0] || 'Usuário',
      phone: profile?.phone,
      instagram: profile?.instagram,
      twitter: profile?.twitter,
      whatsapp: profile?.whatsapp,
      facebook: profile?.facebook,
      linkedin: profile?.linkedin,
      avatar_url: profile?.avatar_url
    };
    
    console.debug('[getUser] profile fetched', userData);
    return userData;
  } catch (error) {
    console.error('[getUser] Fatal error:', error);
    throw error;
  }
}
