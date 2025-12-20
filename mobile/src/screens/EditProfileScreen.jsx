import React, { useState, useEffect } from 'react';
import { Image, TouchableOpacity, View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import * as userService from '../services/user';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { sendPasswordReset } from '../services/supabaseAuth';
import { Picker } from '@react-native-picker/picker';
import { states, citiesByState } from '../lib/br-locations';

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
    <ScrollView style={styles.container}>

      <Card style={{ paddingBottom: 32 }}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={handlePickAvatar} disabled={saving}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 8 }} />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 8 }} />
            ) : (
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 32, color: '#6B7280' }}>{name?.charAt(0) || '?'}</Text>
              </View>
            )}
            <Text style={{ color: '#6366F1', textAlign: 'center' }}>Alterar foto</Text>
          </TouchableOpacity>
          {avatar && (
            <Button
              title={saving ? 'Enviando...' : 'Salvar foto'}
              onPress={handleUploadAvatar}
              disabled={saving}
              loading={saving}
              style={{ marginTop: 8, minWidth: 120 }}
            />
          )}
        </View>
        <Text style={styles.sectionTitle}>Meus Dados</Text>
        <Input
          label="Nome"
          placeholder="Seu nome completo"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        {errorMsg ? (
          <Text style={{ color: '#EF4444', marginBottom: 8 }}>{errorMsg}</Text>
        ) : null}
        <Input
          label="Email"
          placeholder={userProfile?.email}
          editable={false}
          style={styles.input}
        />
        {/* Telefone removido */}
        <Text style={{ fontWeight: 'bold', marginTop: 12, marginBottom: 4 }}>Localidade</Text>
        <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 4 }}>Selecione o estado e a cidade do seu perfil:</Text>
        <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 12, minWidth: 220, maxWidth: '100%', width: '100%', height: 48, justifyContent: 'center' }}>
          <Picker
            selectedValue={profileState}
            onValueChange={uf => {
              setProfileState(uf);
              setProfileCity('');
            }}
            style={{ height: 48, minWidth: 220 }}
          >
            <Picker.Item label="Selecione o estado" value="" />
            {states.map(uf => (
              <Picker.Item key={uf} label={uf} value={uf} />
            ))}
          </Picker>
        </View>
        <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 12, minWidth: 220, maxWidth: '100%', width: '100%', height: 48, justifyContent: 'center' }}>
          <Picker
            selectedValue={profileCity}
            onValueChange={setProfileCity}
            enabled={!!profileState}
            style={{ height: 48, minWidth: 220 }}
          >
            <Picker.Item label="Selecione a cidade" value="" />
            {(citiesByState[profileState] || []).map(city => (
              <Picker.Item key={city} label={city} value={city} />
            ))}
          </Picker>
        </View>
        <Button
          title="Redefinir senha"
          onPress={handleChangePassword}
          style={[styles.input, { marginBottom: 12 }]}
        />

        <Text style={styles.sectionTitle}>Redes Sociais</Text>
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
        {/* Twitter removido */}
        <Input
          label="WhatsApp"
          placeholder="(XX) XXXXX-XXXX"
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
          style={styles.input}
        />
        {/* LinkedIn removido */}
        <View style={[styles.actions, { marginBottom: 32 }]}> 
          <Button
            title="Cancelar"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
          />
          <Button
            title={saving ? 'Salvando...' : 'Salvar'}
            onPress={handleSave}
            disabled={saving}
            loading={saving}
            style={{ flex: 1, marginLeft: 8 }}
          />
        </View>

        {/* Seção de exclusão de conta */}
        <View style={{ marginTop: 32, alignItems: 'center', marginBottom: 32 }}>
          <Text style={{ color: '#EF4444', fontWeight: 'bold', marginBottom: 8, fontSize: 16 }}>Excluir Conta</Text>
          <Text style={{ color: '#6B7280', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
            Esta ação é irreversível. Todos os seus dados serão apagados.
          </Text>
          <Button
            title="Excluir minha conta"
            variant="danger"
            onPress={handleDeleteAccount}
            style={{ minWidth: 180 }}
          />
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F2937',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    color: '#1F2937',
  },
  input: {
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 24,
  },
});

export default EditProfileScreen;
