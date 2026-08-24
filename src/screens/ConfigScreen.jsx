import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword } from '../services/supabaseAuth';

const preferenceKeys = {
  notifications: '@recover/preferences/notifications',
  reminders: '@recover/preferences/reminders',
  whatsappNotifications: '@recover/preferences/whatsapp_notifications',
};

const ConfigScreen = ({ navigation }) => {
  const { user, userProfile, signOut, refreshProfile } = useAuth();
  const [preferences, setPreferences] = useState({
    notifications: true,
    reminders: true,
    whatsappNotifications: userProfile?.whatsapp_notifications_enabled !== false,
  });
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      const values = await AsyncStorage.multiGet(Object.values(preferenceKeys));
      setPreferences({
        notifications: values[0][1] !== 'false',
        reminders: values[1][1] !== 'false',
        whatsappNotifications: userProfile?.whatsapp_notifications_enabled !== false,
      });
    };
    loadPreferences();
  }, [userProfile]);

  const togglePreference = async (name) => {
    const value = !preferences[name];
    setPreferences(current => ({ ...current, [name]: value }));
    await AsyncStorage.setItem(preferenceKeys[name], String(value));

    if (name === 'whatsappNotifications' && user?.id) {
      try {
        const { supabase } = require('../lib/supabase');
        await supabase.from('profiles').update({
          whatsapp_notifications_enabled: value,
        }).eq('id', user.id);
        if (typeof refreshProfile === 'function') refreshProfile();
      } catch (err) {
        console.warn('[ConfigScreen] Falha ao atualizar preferência de WhatsApp:', err.message);
      }
    }
  };

  const handlePasswordChange = () => {
    setNewPassword('');
    setPasswordModalVisible(true);
  };

  const savePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Senha inválida', 'A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    try {
      setUpdatingPassword(true);
      await updatePassword(newPassword);
      setPasswordModalVisible(false);
      Alert.alert('Senha atualizada', 'Sua nova senha já está ativa.');
    } catch (error) {
      Alert.alert('Não foi possível atualizar', error?.message || 'Tente novamente.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const SettingRow = ({ icon, title, description, onPress, right }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}><Feather name={icon} size={19} color="#2563EB" /></View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      {right || <Feather name="chevron-right" size={20} color="#8A9A9F" />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>Preferências</Text>
      <View style={styles.panel}>
        <SettingRow icon="bell" title="Notificações no App" description="Receber novidades e mensagens internas" right={<Switch value={preferences.notifications} onValueChange={() => togglePreference('notifications')} trackColor={{ false: '#DBEAFE', true: '#BFDBFE' }} thumbColor={preferences.notifications ? '#2563EB' : '#F8FAFC'} />} />
        <View style={styles.divider} />
        <SettingRow icon="message-circle" title="Notificações por WhatsApp" description="Receber avisos e avistamentos de pets no seu WhatsApp" right={<Switch value={preferences.whatsappNotifications} onValueChange={() => togglePreference('whatsappNotifications')} trackColor={{ false: '#DBEAFE', true: '#BFDBFE' }} thumbColor={preferences.whatsappNotifications ? '#2563EB' : '#F8FAFC'} />} />
        <View style={styles.divider} />
        <SettingRow icon="clock" title="Lembretes de publicações" description="Avisar quando uma publicação precisar de renovação" right={<Switch value={preferences.reminders} onValueChange={() => togglePreference('reminders')} trackColor={{ false: '#DBEAFE', true: '#BFDBFE' }} thumbColor={preferences.reminders ? '#2563EB' : '#F8FAFC'} />} />
      </View>

      <Text style={styles.sectionLabel}>Conta</Text>
      <View style={styles.panel}>
        <SettingRow icon="user" title="Editar perfil" description="Nome, telefone e localização" onPress={() => navigation.navigate('EditProfile')} />
        <View style={styles.divider} />
        <SettingRow icon="lock" title="Alterar senha" description="Mantenha sua conta protegida" onPress={handlePasswordChange} />
        <View style={styles.divider} />
        <SettingRow icon="refresh-cw" title="Sincronizar dados" description="Atualizar as informações do seu perfil" onPress={async () => { await refreshProfile(); Alert.alert('Dados atualizados', 'Seu perfil foi sincronizado.'); }} />
      </View>

      <Text style={styles.sectionLabel}>Informações</Text>
      <View style={styles.panel}>
        <SettingRow icon="help-circle" title="Ajuda e suporte" onPress={() => navigation.navigate('AjudaSuporte')} />
        <View style={styles.divider} />
        <SettingRow icon="file-text" title="Termos de uso" onPress={() => Linking.openURL('https://wefind.app/termos')} />
        <View style={styles.divider} />
        <SettingRow icon="shield" title="Política de privacidade" onPress={() => Linking.openURL('https://wefind.app/privacidade')} />
      </View>

      <TouchableOpacity style={styles.logout} onPress={signOut} activeOpacity={0.8}>
        <Feather name="log-out" size={18} color="#DC2626" />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
      <Text style={styles.version}>WeFIND • versão 1.0.0</Text>

      <Modal visible={passwordModalVisible} transparent animationType="fade" onRequestClose={() => setPasswordModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Alterar senha</Text>
            <Text style={styles.modalDescription}>Crie uma senha com pelo menos 6 caracteres.</Text>
            <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="Nova senha" placeholderTextColor="#A1A1AA" secureTextEntry autoFocus style={styles.passwordInput} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={savePassword} disabled={updatingPassword} style={styles.saveButton}>{updatingPassword ? <Text style={styles.saveText}>Salvando...</Text> : <Text style={styles.saveText}>Salvar senha</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7FB' },
  content: { padding: 20, paddingBottom: 42 },
  sectionLabel: { color: '#71717A', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 9, marginLeft: 3, textTransform: 'uppercase' },
  panel: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 15, marginBottom: 22, borderWidth: 1, borderColor: '#E4E4E7' },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowCopy: { flex: 1, paddingVertical: 10 },
  rowTitle: { color: '#18181B', fontSize: 15, fontWeight: '700' },
  rowDescription: { color: '#71717A', fontSize: 12, marginTop: 3, lineHeight: 17 },
  divider: { height: 1, backgroundColor: '#F0F0F2', marginLeft: 50 },
  logout: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FFF7F7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '800' },
  version: { color: '#A1A1AA', textAlign: 'center', fontSize: 12, marginTop: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(24, 24, 27, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 20 },
  modalTitle: { color: '#18181B', fontSize: 19, fontWeight: '800' },
  modalDescription: { color: '#71717A', fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 15 },
  passwordInput: { height: 50, borderWidth: 1, borderColor: '#D4D4D8', borderRadius: 11, paddingHorizontal: 13, color: '#18181B', fontSize: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 17 },
  cancelButton: { paddingVertical: 11, paddingHorizontal: 10 },
  cancelText: { color: '#71717A', fontWeight: '700' },
  saveButton: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14 },
  saveText: { color: '#fff', fontWeight: '800' },
});

export default ConfigScreen;
