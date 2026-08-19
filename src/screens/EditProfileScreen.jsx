import React, { useState, useEffect } from 'react';
import { Image, TouchableOpacity, View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import * as userService from '../services/user';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import * as supabaseAuth from '../services/supabaseAuth';
import { sendPasswordReset } from '../services/supabaseAuth';
import { Picker } from '@react-native-picker/picker';
import { states, citiesByState } from '../lib/br-locations';

const formatBrazilianPhone = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);

  if (!digits) return '';

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const EditProfileScreen = ({ navigation }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null); // uri local
  const [avatarUrl, setAvatarUrl] = useState(null); // url pública
  // Removido Telefone
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  // Removido Twitter
  const [whatsapp, setWhatsapp] = useState('');
  // Removido LinkedIn
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileState, setProfileState] = useState('');
  const [profileCity, setProfileCity] = useState('');
  // Removido campos de senha

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setInstagram(userProfile.instagram || '');
      setFacebook(userProfile.facebook || '');
      setWhatsapp(userProfile.whatsapp || '');
      setProfileState(userProfile.state || '');
      setProfileCity(userProfile.city || '');
      // Avatar
      if (userProfile.avatar_url) {
        setAvatarUrl(userProfile.avatar_url);
        console.log('[EditProfileScreen] avatarUrl atualizado:', userProfile.avatar_url);
      } else {
        setAvatarUrl(null);
        console.log('[EditProfileScreen] avatarUrl está nulo');
      }
    }
  }, [userProfile]);
  // Selecionar nova foto
  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatar(result.assets[0].uri);
    }
  };

  // Upload da foto
  const handleUploadAvatar = async () => {
    if (!avatar || !user) return;
    setSaving(true);
    try {
      await userService.uploadAvatar(user.id, avatar);
      setAvatar(null);
      await refreshProfile();
    } catch (e) {
      Alert.alert('Erro', e.message || 'Erro ao enviar foto');
    } finally {
      setSaving(false);
    }
  };

  const [errorMsg, setErrorMsg] = useState('');
  const handleSave = async () => {
    if (!user) return;
    setErrorMsg('');
    // Validação da localidade
    if (!profileState || !profileCity) {
      setErrorMsg('Selecione o estado e a cidade.');
      setSaving(false);
      return;
    }
    // Não valida mais senha aqui
    try {
      setSaving(true);
      const result = await userService.updateProfile(user.id, {
        name,
        // phone removido
        instagram,
        facebook,
        // twitter removido
        whatsapp,
        // linkedin removido
        state: profileState,
        city: profileCity,
      });
      // Não altera mais senha diretamente
      console.log('[EditProfileScreen] Perfil atualizado:', result);
      await refreshProfile();
      navigation.goBack();
    } catch (error) {
      setErrorMsg(error.message || 'Erro ao salvar perfil');
      console.log('Erro ao salvar perfil:', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    Alert.alert(
      'Redefinir senha',
      'Você receberá um e-mail para redefinir sua senha. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              const error = await sendPasswordReset(user.email);
              if (!error) {
                Alert.alert('Sucesso', 'Verifique seu e-mail para redefinir sua senha.');
              } else {
                Alert.alert('Erro', error.message || 'Não foi possível enviar o e-mail.');
              }
            } catch (e) {
              Alert.alert('Erro', e.message || 'Erro ao solicitar redefinição.');
            }
          },
        },
      ]
    );
  };

  const handleChangeEmail = async () => {
    // Pode abrir modal ou navegar para tela de alteração de email
    Alert.prompt('Alterar Email', 'Digite o novo email:', async (newEmail) => {
      if (!newEmail) return;
      try {
        // Supabase requer reautenticação para updateUser
        await supabaseAuth.updateEmail(newEmail);
        Alert.alert('Sucesso', 'Email alterado com sucesso!');
      } catch (e) {
        Alert.alert('Erro', e.message || 'Erro ao alterar email');
      }
    });
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Excluir Conta',
      'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive', onPress: async () => {
            try {
              await supabaseAuth.deleteUser();
              Alert.alert('Conta excluída', 'Sua conta foi excluída com sucesso.');
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            } catch (e) {
              Alert.alert('Erro', e.message || 'Erro ao excluir conta');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.pageCard}>
        <View style={styles.headerSection}>
          <TouchableOpacity onPress={handlePickAvatar} disabled={saving} style={styles.avatarButton}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{name?.charAt(0) || '?'}</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeText}>✎</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.headerName}>{name || 'Seu nome'}</Text>
          <Text style={styles.headerSubtitle}>Atualize suas informações pessoais</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Dados pessoais</Text>
          <Input
            label="Nome"
            placeholder="Seu nome completo"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <Input
            label="Email"
            placeholder={userProfile?.email}
            editable={false}
            onChangeText={() => {}}
            style={styles.input}
          />

          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Localização</Text>
          <Text style={styles.helperText}>Selecione o estado e a cidade do seu perfil.</Text>

          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={profileState}
              onValueChange={uf => {
                setProfileState(uf);
                setProfileCity('');
              }}
              style={styles.picker}
            >
              <Picker.Item label="Selecione o estado" value="" />
              {states.map(uf => (
                <Picker.Item key={uf} label={uf} value={uf} />
              ))}
            </Picker>
          </View>

          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={profileCity}
              onValueChange={setProfileCity}
              enabled={!!profileState}
              style={styles.picker}
            >
              <Picker.Item label="Selecione a cidade" value="" />
              {(citiesByState[profileState] || []).map(city => (
                <Picker.Item key={city} label={city} value={city} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Contato</Text>
          <Input
            label="WhatsApp"
            placeholder="(11) 99999-9999"
            value={formatBrazilianPhone(whatsapp)}
            onChangeText={text => setWhatsapp(text.replace(/\D/g, ''))}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <Input
            label="Instagram"
            placeholder="seu_usuario"
            value={instagram}
            onChangeText={setInstagram}
            style={styles.input}
          />
          <Input
            label="Facebook"
            placeholder="seu_usuario"
            value={facebook}
            onChangeText={setFacebook}
            style={styles.input}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Segurança</Text>
          <Button
            title="Redefinir senha"
            onPress={handleChangePassword}
            variant="secondary"
            style={styles.actionButton}
          />
        </View>

        <View style={styles.footerActions}>
          <Button
            title="Cancelar"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.footerButton}
          />
          <Button
            title={saving ? 'Salvando...' : 'Salvar'}
            onPress={handleSave}
            disabled={saving}
            loading={saving}
            style={[styles.footerButton, styles.primaryFooterButton]}
          />
        </View>

        <View style={styles.deleteBlock}>
          <Text style={styles.deleteTitle}>Excluir conta</Text>
          <Text style={styles.deleteText}>Esta ação é irreversível. Todos os seus dados serão apagados.</Text>
          <Button
            title="Excluir minha conta"
            variant="danger"
            onPress={handleDeleteAccount}
            style={styles.deleteButton}
          />
        </View>

        {avatar && (
          <Button
            title={saving ? 'Enviando...' : 'Salvar foto'}
            onPress={handleUploadAvatar}
            disabled={saving}
            loading={saving}
            style={styles.saveAvatarButton}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  pageCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    overflow: 'hidden',
  },
  headerSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  avatarButton: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarImage: {
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#E5E7EB',
  },
  avatarFallback: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: '800',
    color: '#6B7280',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '700',
  },
  headerName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  headerSubtitle: {
    marginTop: 4,
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
    color: '#1F2937',
  },
  helperText: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
    overflow: 'hidden',
    minHeight: 52,
  },
  picker: {
    height: 52,
    color: '#1F2937',
  },
  actionButton: {
    marginTop: 4,
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  footerActions: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 20,
    gap: 10,
    paddingBottom: 8,
  },
  footerButton: {
    flex: 1,
    minHeight: 48,
  },
  primaryFooterButton: {
    marginLeft: 0,
  },
  deleteBlock: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  deleteTitle: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  deleteText: {
    color: '#7F1D1D',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteButton: {
    minWidth: 180,
  },
  saveAvatarButton: {
    marginTop: 16,
  },
});

export default EditProfileScreen;
