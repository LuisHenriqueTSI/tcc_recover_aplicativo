import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { updatePassword } from '../services/supabaseAuth';

const preferenceKeys = {
  notifications: '@recover/preferences/notifications',
  reminders: '@recover/preferences/reminders',
  whatsappNotifications: '@recover/preferences/whatsapp_notifications',
};

const ConfigScreen = ({ navigation }) => {
  const { user, userProfile, signOut, refreshProfile } = useAuth();
  const { themeMode, isDark, colors, setThemeMode } = useTheme();

  const [preferences, setPreferences] = useState({
    notifications: true,
    reminders: true,
    whatsappNotifications: userProfile?.whatsapp_notifications_enabled !== false,
  });
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
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
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.primaryLight }]}>
        <Feather name={icon} size={19} color={colors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        {description ? (
          <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
            {description}
          </Text>
        ) : null}
      </View>
      {right || <Feather name="chevron-right" size={20} color={colors.textMuted} />}
    </TouchableOpacity>
  );

  const handleTestWhatsAppNotification = async () => {
    if (!user?.id) {
      Alert.alert('Login necessário', 'Você precisa estar logado para testar.');
      return;
    }

    try {
      const { dispatchSystemNotificationToWhatsApp } = require('../services/whatsappNotifications');
      const result = await dispatchSystemNotificationToWhatsApp({
        userId: user.id,
        title: '🐾 Teste de Alerta WeFIND',
        message: 'Olá! Este é um teste confirmando que o seu WhatsApp está 100% configurado para receber notificações do WeFIND.',
        type: 'test_alert',
      });

      if (result?.sent) {
        Alert.alert('Sucesso! 🎉', 'Mensagem de teste enviada para o seu WhatsApp cadastrado.');
      } else if (result?.reason === 'user-opted-out') {
        Alert.alert('Notificações desativadas', 'Você desativou o recebimento de mensagens no WhatsApp. Ative a chave acima para receber.');
      } else if (result?.reason === 'missing-whatsapp') {
        Alert.alert('WhatsApp não cadastrado', 'Edite seu perfil para informar seu número de WhatsApp.');
      } else {
        Alert.alert('Status do Envio', result?.reason || 'Verifique o status da Evolution API.');
      }
    } catch (err) {
      Alert.alert('Erro ao enviar', err.message || 'Falha ao disparar mensagem.');
    }
  };

  const themeOptions = [
    { id: 'light', label: 'Modo Claro', icon: 'sun', description: 'Visual clássico e luminoso' },
    { id: 'dark', label: 'Modo Escuro', icon: 'moon', description: 'Descanso visual e economia de bateria' },
    { id: 'system', label: 'Automático (Sistema)', icon: 'smartphone', description: 'Seguir configurações do seu dispositivo' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* SEÇÃO: APARÊNCIA */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Aparência</Text>
      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <SettingRow
          icon={isDark ? 'moon' : 'sun'}
          title="Tema Escuro"
          description={
            themeMode === 'system'
              ? `Automático (Seguindo sistema: ${isDark ? 'Escuro' : 'Claro'})`
              : isDark
              ? 'Ativado (Modo Escuro)'
              : 'Desativado (Modo Claro)'
          }
          right={
            <Switch
              value={isDark}
              onValueChange={(val) => setThemeMode(val ? 'dark' : 'light')}
              trackColor={{ false: isDark ? '#334155' : '#DBEAFE', true: colors.primary }}
              thumbColor={isDark ? '#FFFFFF' : '#2563EB'}
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <SettingRow
          icon="sliders"
          title="Opções de Tema"
          description={
            themeMode === 'light'
              ? 'Modo Claro ☀️'
              : themeMode === 'dark'
              ? 'Modo Escuro 🌙'
              : 'Automático (Sistema do Celular) 📱'
          }
          onPress={() => setThemeModalVisible(true)}
        />
      </View>

      {/* SEÇÃO: PREFERÊNCIAS */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Preferências</Text>
      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <SettingRow
          icon="bell"
          title="Notificações no App"
          description="Receber novidades e mensagens internas"
          right={
            <Switch
              value={preferences.notifications}
              onValueChange={() => togglePreference('notifications')}
              trackColor={{ false: isDark ? '#334155' : '#DBEAFE', true: colors.primary }}
              thumbColor={preferences.notifications ? (isDark ? '#FFFFFF' : '#2563EB') : '#F8FAFC'}
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <SettingRow
          icon="message-circle"
          title="Notificações por WhatsApp"
          description="Receber avisos e novas informações de pets no seu WhatsApp"
          right={
            <Switch
              value={preferences.whatsappNotifications}
              onValueChange={() => togglePreference('whatsappNotifications')}
              trackColor={{ false: isDark ? '#334155' : '#DBEAFE', true: colors.primary }}
              thumbColor={preferences.whatsappNotifications ? (isDark ? '#FFFFFF' : '#2563EB') : '#F8FAFC'}
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <SettingRow
          icon="clock"
          title="Lembretes de publicações"
          description="Avisar quando uma publicação precisar de renovação"
          right={
            <Switch
              value={preferences.reminders}
              onValueChange={() => togglePreference('reminders')}
              trackColor={{ false: isDark ? '#334155' : '#DBEAFE', true: colors.primary }}
              thumbColor={preferences.reminders ? (isDark ? '#FFFFFF' : '#2563EB') : '#F8FAFC'}
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <SettingRow
          icon="send"
          title="Enviar teste no WhatsApp"
          description="Disparar um alerta de teste para o seu número agora"
          onPress={handleTestWhatsAppNotification}
        />
      </View>

      {/* SEÇÃO: CONTA */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Conta</Text>
      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <SettingRow icon="user" title="Editar perfil" description="Nome, telefone e localização" onPress={() => navigation.navigate('EditProfile')} />
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <SettingRow icon="lock" title="Alterar senha" description="Mantenha sua conta protegida" onPress={handlePasswordChange} />
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <SettingRow
          icon="refresh-cw"
          title="Sincronizar dados"
          description="Atualizar as informações do seu perfil"
          onPress={async () => {
            await refreshProfile();
            Alert.alert('Dados atualizados', 'Seu perfil foi sincronizado.');
          }}
        />
      </View>

      {/* SEÇÃO: INFORMAÇÕES */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Informações</Text>
      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <SettingRow icon="info" title="Sobre o WeFIND" description="Conheça o aplicativo e nossa missão" onPress={() => navigation.navigate('Sobre', { forceFullView: true })} />
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <SettingRow icon="help-circle" title="Ajuda e suporte" onPress={() => navigation.navigate('AjudaSuporte')} />
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <SettingRow icon="file-text" title="Termos de uso" onPress={() => Linking.openURL('https://wefind.app/termos')} />
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <SettingRow icon="shield" title="Política de privacidade" onPress={() => Linking.openURL('https://wefind.app/privacidade')} />
      </View>

      <TouchableOpacity
        style={[
          styles.logout,
          {
            backgroundColor: isDark ? '#2D1515' : '#FFF7F7',
            borderColor: isDark ? '#7F1D1D' : '#FECACA',
          },
        ]}
        onPress={signOut}
        activeOpacity={0.8}
      >
        <Feather name="log-out" size={18} color="#DC2626" />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
      <Text style={[styles.version, { color: colors.textMuted }]}>WeFIND • versão 1.0.0</Text>

      {/* MODAL DE SELEÇÃO DE TEMA */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Escolha o Tema</Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Selecione o esquema de cores de sua preferência:
            </Text>

            {themeOptions.map((opt) => {
              const isSelected = themeMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => {
                    setThemeMode(opt.id);
                    setThemeModalVisible(false);
                  }}
                  style={[
                    styles.themeOptionCard,
                    {
                      backgroundColor: isSelected ? colors.primaryLight : (isDark ? '#111827' : '#F8FAFC'),
                      borderColor: isSelected ? colors.primary : colors.cardBorder,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.themeOptionIcon, { backgroundColor: isSelected ? colors.primary : (isDark ? '#1E293B' : '#E2E8F0') }]}>
                    <Feather name={opt.icon} size={18} color={isSelected ? '#FFFFFF' : (isDark ? '#94A3B8' : '#475569')} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.themeOptionLabel, { color: isSelected ? colors.primary : colors.text }]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.themeOptionDesc, { color: colors.textSecondary }]}>
                      {opt.description}
                    </Text>
                  </View>
                  <Feather
                    name={isSelected ? 'check-circle' : 'circle'}
                    size={20}
                    color={isSelected ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => setThemeModalVisible(false)}
              style={[styles.closeModalButton, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
            >
              <Text style={[styles.closeModalText, { color: colors.text }]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE ALTERAÇÃO DE SENHA */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Alterar senha</Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Crie uma senha com pelo menos 6 caracteres.
            </Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nova senha"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoFocus
              style={[styles.passwordInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)} style={styles.cancelButton}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={savePassword}
                disabled={updatingPassword}
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
              >
                {updatingPassword ? (
                  <Text style={styles.saveText}>Salvando...</Text>
                ) : (
                  <Text style={styles.saveText}>Salvar senha</Text>
                )}
              </TouchableOpacity>
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 20 },
  modalTitle: { color: '#18181B', fontSize: 19, fontWeight: '800' },
  modalDescription: { color: '#71717A', fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 15 },
  passwordInput: { height: 50, borderWidth: 1, borderColor: '#D4D4D8', borderRadius: 11, paddingHorizontal: 13, color: '#18181B', fontSize: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 17 },
  cancelButton: { paddingVertical: 11, paddingHorizontal: 10 },
  cancelText: { color: '#71717A', fontWeight: '700' },
  saveButton: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14 },
  saveText: { color: '#fff', fontWeight: '800' },
  themeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  themeOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionLabel: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  themeOptionDesc: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeModalButton: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalText: {
    fontWeight: '700',
    fontSize: 14,
  },
});

export default ConfigScreen;

