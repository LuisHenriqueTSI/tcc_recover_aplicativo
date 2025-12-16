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

const EditProfileScreen = ({ navigation }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPhone(userProfile.phone || '');
      setBio(userProfile.bio || '');
      
      if (userProfile.social_media) {
        setInstagram(userProfile.social_media.instagram || '');
        setFacebook(userProfile.social_media.facebook || '');
        setTwitter(userProfile.social_media.twitter || '');
        setWhatsapp(userProfile.social_media.whatsapp || '');
      }
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await userService.updateProfile(user.id, {
        name,
        phone,
        bio,
        social_media: {
          instagram,
          facebook,
          twitter,
          whatsapp,
        },
      });

      await refreshProfile();
      navigation.goBack();
    } catch (error) {
      console.log('Erro ao salvar perfil:', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Text style={styles.title}>Editar Perfil</Text>

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
          label="Bio"
          placeholder="Fale um pouco sobre você"
          value={bio}
          onChangeText={setBio}
          multiline={true}
          numberOfLines={3}
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

        <View style={styles.actions}>
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
