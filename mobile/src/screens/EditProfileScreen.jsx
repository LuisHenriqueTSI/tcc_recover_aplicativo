import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import * as userService from '../services/user';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { Alert } from 'react-native';
import * as supabaseAuth from '../services/supabaseAuth';

const EditProfileScreen = ({ navigation }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (userProfile) {
      console.log('[EditProfileScreen] Dados carregados do perfil:', userProfile);
      setName(userProfile.name || '');
      setPhone(userProfile.phone || '');
      setInstagram(userProfile.instagram || '');
      setFacebook(userProfile.facebook || '');
      setTwitter(userProfile.twitter || '');
      setWhatsapp(userProfile.whatsapp || '');
      setLinkedin(userProfile.linkedin || '');
      setLocation(userProfile.location || '');
    }
  }, [userProfile]);

  const [errorMsg, setErrorMsg] = useState('');
  const handleSave = async () => {
    if (!user) return;
    setErrorMsg('');
    // Validação da localidade
    const isValidLocation = (loc) => /^[A-Za-zÀ-ÿ\s]+,\s?[A-Z]{2}$/.test(loc.trim());
    if (location && !isValidLocation(location)) {
      setErrorMsg('Localidade inválida. Use o formato: Cidade, UF (ex: Pelotas, RS)');
      return;
    }
    // Validação de senha
    if (password || confirmPassword) {
      if (password.length < 6) {
        setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('As senhas não coincidem.');
        return;
      }
    }
    try {
      setSaving(true);
      const result = await userService.updateProfile(user.id, {
        name,
        phone,
        instagram,
        facebook,
        twitter,
        whatsapp,
        linkedin,
        location: location.trim(),
      });
      if (password) {
        await supabaseAuth.updatePassword(password);
      }
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
    // Pode abrir modal ou navegar para tela de alteração de senha
    Alert.prompt('Alterar Senha', 'Digite a nova senha:', async (newPassword) => {
      if (!newPassword) return;
      try {
        await supabaseAuth.updatePassword(newPassword);
        Alert.alert('Sucesso', 'Senha alterada com sucesso!');
      } catch (e) {
        Alert.alert('Erro', e.message || 'Erro ao alterar senha');
      }
    });
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
        <Input
          label="Telefone"
          placeholder="(XX) XXXXX-XXXX"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />
        <Input
          label="Localidade"
          placeholder="Cidade, UF"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
        />
        <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 8 }}>
          Exemplo: Pelotas, RS
        </Text>
        <Input
          label="Nova Senha"
          placeholder="Digite a nova senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        <Input
          label="Confirmar Nova Senha"
          placeholder="Confirme a nova senha"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
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
        <Input
          label="Twitter"
          placeholder="seu_usuario"
          value={twitter}
          onChangeText={setTwitter}
          style={styles.input}
        />
        <Input
          label="WhatsApp"
          placeholder="(XX) XXXXX-XXXX"
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
          style={styles.input}
        />
        <Input
          label="LinkedIn"
          placeholder="seu_usuario"
          value={linkedin}
          onChangeText={setLinkedin}
          style={styles.input}
        />
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
        <View style={{ marginTop: 32, alignItems: 'center' }}>
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
