import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleSidebar from '../components/SimpleSidebar';
import { useAuth } from '../contexts/AuthContext';
import { getUser as getUserProfile } from '../services/user';
import { supabase } from '../supabaseClient';

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, login, reloadProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [facebook, setFacebook] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    async function load() {
      if (user) {
        setName(user.name || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
        setInstagram(user.instagram || '');
        setTwitter(user.twitter || '');
        setWhatsapp(user.whatsapp || '');
        setFacebook(user.facebook || '');
        setLinkedin(user.linkedin || '');
        return;
      }
      try {
        const u = await getUserProfile();
        setName(u.name || '');
        setEmail(u.email || '');
        setPhone(u.phone || '');
        setInstagram(u.instagram || '');
        setTwitter(u.twitter || '');
        setWhatsapp(u.whatsapp || '');
        setFacebook(u.facebook || '');
        setLinkedin(u.linkedin || '');
      } catch (e) {
        console.debug('Failed to load profile', e);
      }
    }
    load();
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !authUser) {
        throw new Error('Usuário não autenticado');
      }

      // Atualizar perfil no Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          name,
          phone,
          instagram,
          twitter,
          whatsapp,
          facebook,
          linkedin,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (updateError) {
        throw new Error(updateError.message || 'Erro ao atualizar perfil');
      }

      // Recarregar dados do usuário
      await reloadProfile();
      
      setSuccess('Perfil atualizado com sucesso');
      setTimeout(() => navigate('/profile'), 700);
    } catch (err) {
      setError(err.message || 'Erro ao atualizar');
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        setError('Usuário não autenticado');
        return;
      }

      console.log('[DeleteAccount] Starting account deletion for user:', authUser.id);

      // Delete user's items and related data (photos will cascade)
      console.log('[DeleteAccount] Deleting items...');
      const { error: itemsError } = await supabase
        .from('items')
        .delete()
        .eq('owner_id', authUser.id);

      if (itemsError) {
        console.error('[DeleteAccount] Items deletion error:', itemsError);
        throw itemsError;
      }

      // Delete messages sent by user
      console.log('[DeleteAccount] Deleting messages...');
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('sender_id', authUser.id);

      if (messagesError) {
        console.error('[DeleteAccount] Messages deletion error:', messagesError);
        throw messagesError;
      }

      // Mark profile as deleted (soft delete) instead of removing it
      console.log('[DeleteAccount] Marking profile as deleted...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id);

      if (profileError) {
        console.error('[DeleteAccount] Profile update error:', profileError);
        // If status column doesn't exist, just delete the profile instead
        if (profileError.message?.includes('status')) {
          console.log('[DeleteAccount] Status column not found, deleting profile instead...');
          const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', authUser.id);
          
          if (deleteError) {
            console.error('[DeleteAccount] Profile delete error:', deleteError);
            throw deleteError;
          }
        } else {
          throw profileError;
        }
      }

      console.log('[DeleteAccount] Account marked as deleted, signing out...');
      
      // Sign out user
      await supabase.auth.signOut();
      
      console.log('[DeleteAccount] Successfully deleted account and signed out');
      setSuccess('Conta deletada com sucesso. Redirecionando...');
      
      // Redirect to home after a short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error.message || 'Erro ao excluir conta');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB');
      return;
    }

    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    setUploadingAvatar(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Starting avatar upload for user:', authUser.id);

      // Upload to Supabase Storage
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${authUser.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      console.log('Uploading file:', filePath);

      const { data, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      console.log('Public URL:', urlData.publicUrl);

      // Update profile with avatar URL
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: urlData.publicUrl,
          updated_at: new Date().toISOString() 
        })
        .eq('id', authUser.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('Profile updated:', updateData);

      // Reload profile to get updated avatar
      await reloadProfile();
      
      setSuccess('Foto de perfil atualizada com sucesso!');
      setAvatarFile(null);
      setAvatarPreview(null);
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError(error.message || 'Erro ao fazer upload da foto');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark">
      <SimpleSidebar onCollapseChange={setSidebarCollapsed} />
      
      <main className={`flex flex-1 justify-center px-4 py-8 sm:px-6 md:py-12 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-80'}`}>
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <h2 className="text-4xl font-black tracking-tighter text-text-light">Edição de Perfil</h2>
            <p className="mt-2 text-text-light/70">Atualize suas informações pessoais e de contato.</p>
          </div>

          <div className="rounded-xl border border-surface-dark bg-surface-dark/50">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4 p-6 text-center sm:p-8">
              <div className="relative h-32 w-32">
                <div 
                  className="h-full w-full rounded-full bg-cover bg-center border-2 border-surface-dark"
                  style={{ 
                    backgroundImage: avatarPreview 
                      ? `url("${avatarPreview}")` 
                      : user?.avatar_url 
                        ? `url("${user.avatar_url}")` 
                        : `url("https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.email || 'User')}&background=3B82F6&color=fff&size=128")`
                  }}
                />
                <label 
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface-dark bg-primary text-white transition-transform hover:scale-110 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">edit</span>
                  <input 
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                {avatarFile ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-bold text-text-light">{avatarFile.name}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={uploadingAvatar}
                        className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:opacity-90 disabled:opacity-50"
                      >
                        {uploadingAvatar ? 'Enviando...' : 'Salvar Foto'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(null);
                        }}
                        disabled={uploadingAvatar}
                        className="px-4 py-2 text-sm font-bold text-text-light/80 bg-surface-dark rounded-lg hover:bg-surface-dark/70 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-lg font-bold text-text-light">Alterar foto</p>
                )}
                <p className="text-sm text-text-light/60">PNG ou JPG (máx. 800x800px)</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 border-t border-surface-dark p-6 sm:p-8">
              {/* Nome */}
              <div className="grid grid-cols-1 gap-6">
                <label className="flex flex-col">
                  <span className="pb-2 text-sm font-medium text-text-light/90">Nome</span>
                  <input 
                    className="form-input h-12 w-full rounded-lg border-2 border-surface-dark bg-background-dark px-4 text-base text-text-light placeholder:text-disabled-dark/80 focus:border-primary focus:outline-none focus:ring-0"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </label>
              </div>

              {/* Email (disabled) */}
              <label className="flex flex-col">
                <span className="pb-2 text-sm font-medium text-text-light/90">E-mail</span>
                <div className="relative flex w-full items-center">
                  <input 
                    className="form-input h-12 w-full cursor-not-allowed rounded-lg border-2 border-disabled-dark/50 bg-disabled-dark/30 py-3 pl-4 pr-12 text-base text-disabled-dark placeholder:text-disabled-dark"
                    disabled
                    type="email"
                    value={email}
                  />
                  <span className="material-symbols-outlined absolute right-4 text-2xl text-disabled-dark">lock</span>
                </div>
              </label>

              {/* Telefone e WhatsApp */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <label className="flex flex-col">
                  <span className="pb-2 text-sm font-medium text-text-light/90">Telefone</span>
                  <input 
                    className="form-input h-12 w-full rounded-lg border-2 border-surface-dark bg-background-dark px-4 text-base text-text-light placeholder:text-disabled-dark/80 focus:border-primary focus:outline-none focus:ring-0"
                    placeholder="(11) 99999-9999"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </label>
                <label className="flex flex-col">
                  <span className="pb-2 text-sm font-medium text-text-light/90">WhatsApp</span>
                  <input 
                    className="form-input h-12 w-full rounded-lg border-2 border-surface-dark bg-background-dark px-4 text-base text-text-light placeholder:text-disabled-dark/80 focus:border-primary focus:outline-none focus:ring-0"
                    placeholder="(11) 99999-9999"
                    type="tel"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                  />
                </label>
              </div>

              {/* Redes Sociais */}
              <div>
                <p className="pb-2 text-sm font-medium text-text-light/90">Redes Sociais (Opcional)</p>
                <div className="space-y-4">
                  <div className="relative flex w-full items-center">
                    <span className="material-symbols-outlined absolute left-4 text-2xl text-disabled-dark">alternate_email</span>
                    <input 
                      className="form-input h-12 w-full rounded-lg border-2 border-surface-dark bg-background-dark py-3 pl-12 pr-4 text-base text-text-light placeholder:text-disabled-dark/80 focus:border-secondary focus:outline-none focus:ring-0"
                      placeholder="usuário do Instagram"
                      type="text"
                      value={instagram}
                      onChange={e => setInstagram(e.target.value)}
                    />
                  </div>
                  <div className="relative flex w-full items-center">
                    <span className="material-symbols-outlined absolute left-4 text-2xl text-disabled-dark">tag</span>
                    <input 
                      className="form-input h-12 w-full rounded-lg border-2 border-surface-dark bg-background-dark py-3 pl-12 pr-4 text-base text-text-light placeholder:text-disabled-dark/80 focus:border-secondary focus:outline-none focus:ring-0"
                      placeholder="usuário do Twitter"
                      type="text"
                      value={twitter}
                      onChange={e => setTwitter(e.target.value)}
                    />
                  </div>
                  <div className="relative flex w-full items-center">
                    <span className="material-symbols-outlined absolute left-4 text-2xl text-disabled-dark">link</span>
                    <input 
                      className="form-input h-12 w-full rounded-lg border-2 border-surface-dark bg-background-dark py-3 pl-12 pr-4 text-base text-text-light placeholder:text-disabled-dark/80 focus:border-secondary focus:outline-none focus:ring-0"
                      placeholder="Link do perfil no Facebook"
                      type="text"
                      value={facebook}
                      onChange={e => setFacebook(e.target.value)}
                    />
                  </div>
                  <div className="relative flex w-full items-center">
                    <span className="material-symbols-outlined absolute left-4 text-2xl text-disabled-dark">business_center</span>
                    <input 
                      className="form-input h-12 w-full rounded-lg border-2 border-surface-dark bg-background-dark py-3 pl-12 pr-4 text-base text-text-light placeholder:text-disabled-dark/80 focus:border-secondary focus:outline-none focus:ring-0"
                      placeholder="usuário do LinkedIn"
                      type="text"
                      value={linkedin}
                      onChange={e => setLinkedin(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3">
                  {success}
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col-reverse justify-end gap-3 border-t border-surface-dark pt-6 sm:flex-row">
                <button 
                  className="flex h-12 w-full items-center justify-center rounded-lg bg-transparent text-sm font-bold text-text-light/80 ring-1 ring-inset ring-surface-dark transition-colors hover:bg-surface-dark/50 sm:w-auto sm:px-6"
                  type="button"
                  onClick={() => navigate('/profile')}
                >
                  Cancelar
                </button>
                <button 
                  className="flex h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-6"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>

            {/* Danger Zone */}
            <div className="border-t border-red-500/30 bg-red-500/5 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-red-400 mb-2">Zona de Perigo</h3>
              <p className="text-sm text-text-light/70 mb-4">
                Excluir sua conta é permanente e não pode ser desfeito. Todos os seus itens, fotos e mensagens serão removidos.
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex h-10 items-center justify-center rounded-lg bg-red-500/20 px-4 text-sm font-bold text-red-400 ring-1 ring-inset ring-red-500/50 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                disabled={loading}
              >
                Excluir Conta
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-surface-dark bg-background-dark p-6 shadow-xl">
            <h3 className="text-xl font-bold text-text-light mb-4">Confirmar Exclusão de Conta</h3>
            <p className="text-text-light/70 mb-6">
              Tem certeza que deseja excluir sua conta? Esta ação é irreversível e todos os seus dados serão permanentemente removidos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-10 rounded-lg bg-surface-dark text-text-light font-bold transition-colors hover:bg-surface-dark/70"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 h-10 rounded-lg bg-red-500 text-white font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Excluindo...' : 'Excluir Conta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
