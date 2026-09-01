import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import {
  requestPasswordResetByWhatsApp,
  verifyPasswordResetCode,
  resetPasswordWithToken,
} from '../services/supabaseAuth';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { calculatePasswordStrength } from './RegisterScreen';
import COLORS from '../constants/theme';

export default function EsqueciSenhaScreen({ navigation, route }) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const initialWhatsapp = route?.params?.initialWhatsapp || '';
  // Passos: 1 = WhatsApp, 2 = Código, 3 = Nova Senha, 4 = Sucesso
  const [step, setStep] = useState(1);

  // Estados dos formulários
  const [whatsapp, setWhatsapp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Token temporário de uso único
  const [resetToken, setResetToken] = useState('');

  // Contas associadas ao WhatsApp (para quando um mesmo número tiver múltiplos cadastros)
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Cooldown de reenvio de código
  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Formatação em tempo real do telefone (XX) XXXXX-XXXX
  const handleWhatsappChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;

    if (digits.length > 2 && digits.length <= 6) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length > 6 && digits.length <= 10) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 10) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    setWhatsapp(formatted);
  };

  useEffect(() => {
    if (initialWhatsapp) {
      handleWhatsappChange(initialWhatsapp);
    }
  }, [initialWhatsapp]);

  // PASSO 1: Enviar código para o WhatsApp
  const handleRequestCode = async () => {
    const rawDigits = whatsapp.replace(/\D/g, '');
    if (rawDigits.length < 10) {
      Alert.alert('Atenção', 'Informe seu número de WhatsApp com DDD (ex: 11 99999-9999).');
      return;
    }

    if (cooldownSeconds > 0) {
      Alert.alert('Aguarde', `Você poderá solicitar outro código em ${cooldownSeconds}s.`);
      return;
    }

    setLoading(true);
    try {
      const result = await requestPasswordResetByWhatsApp(rawDigits, selectedAccount?.id);
      setMaskedPhone(result.maskedPhone || whatsapp);
      setAccounts(result.accounts || []);
      if (result.accounts && result.accounts.length > 0) {
        setSelectedAccount(result.accounts[0]);
      }
      setCooldownSeconds(60);
      setStep(2);
    } catch (error) {
      Alert.alert('Não foi possível enviar', error.message || 'Verifique o número informado e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // PASSO 2: Validar o código de 6 dígitos
  const handleVerifyCode = async () => {
    const cleanCode = code.trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      Alert.alert('Atenção', 'Digite o código de 6 dígitos enviado ao seu WhatsApp.');
      return;
    }

    setLoading(true);
    try {
      const rawDigits = whatsapp.replace(/\D/g, '');
      const result = await verifyPasswordResetCode(rawDigits, cleanCode, selectedAccount?.id);
      if (result.resetToken) {
        setResetToken(result.resetToken);
        setStep(3);
      } else {
        throw new Error('Token de verificação inválido.');
      }
    } catch (error) {
      Alert.alert('Código Inválido', error.message || 'Código incorreto ou expirado. Verifique e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // PASSO 3: Salvar a nova senha
  const handleSaveNewPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      Alert.alert('Senha Fraca', 'A nova senha deve conter pelo menos 8 caracteres.');
      return;
    }
    if (!/[0-9]/.test(newPassword) || !/[A-Za-z]/.test(newPassword)) {
      Alert.alert('Senha Fraca', 'A nova senha deve conter pelo menos uma letra e um número.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Senhas Diferentes', 'A confirmação de senha não confere com a nova senha.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithToken(resetToken, newPassword);
      setStep(4); // Sucesso
    } catch (error) {
      Alert.alert('Erro ao Redefinir', error.message || 'Não foi possível redefinir sua senha. Tente reiniciar o processo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header Superior com Botão Voltar e Progresso */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === 2) {
                setStep(1);
                setCode('');
              } else if (step === 3) {
                setStep(2);
              } else if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Login');
              }
            }}
            style={styles.backButton}
            accessibilityLabel="Voltar"
          >
            <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Redefinir Senha</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Indicador de Passos */}
          {step < 4 && (
            <View style={styles.stepperContainer}>
              <View style={styles.stepTrack}>
                <View
                  style={[
                    styles.stepIndicator,
                    { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
                    step >= 1 && styles.stepIndicatorActive,
                  ]}
                >
                  <Text style={[styles.stepNumber, { color: colors.textMuted }, step >= 1 && styles.stepNumberActive]}>1</Text>
                </View>
                <View style={[styles.stepLine, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }, step >= 2 && styles.stepLineActive]} />
                <View
                  style={[
                    styles.stepIndicator,
                    { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
                    step >= 2 && styles.stepIndicatorActive,
                  ]}
                >
                  <Text style={[styles.stepNumber, { color: colors.textMuted }, step >= 2 && styles.stepNumberActive]}>2</Text>
                </View>
                <View style={[styles.stepLine, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }, step >= 3 && styles.stepLineActive]} />
                <View
                  style={[
                    styles.stepIndicator,
                    { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
                    step >= 3 && styles.stepIndicatorActive,
                  ]}
                >
                  <Text style={[styles.stepNumber, { color: colors.textMuted }, step >= 3 && styles.stepNumberActive]}>3</Text>
                </View>
              </View>
              <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>
                {step === 1 && 'Passo 1 de 3: Identificação'}
                {step === 2 && 'Passo 2 de 3: Código de Segurança'}
                {step === 3 && 'Passo 3 de 3: Nova Senha'}
              </Text>
            </View>
          )}

          {/* ======================================================== */}
          {/* PASSO 1: INFORMAR O NÚMERO DO WHATSAPP */}
          {/* ======================================================== */}
          {step === 1 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : COLORS.primaryLight }]}>
                <MaterialIcons name="phone-android" size={32} color={colors.primary} />
              </View>

              <Text style={[styles.cardTitle, { color: colors.text }]}>Recuperar Acesso</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Informe o número de WhatsApp cadastrado na sua conta para enviarmos um código de verificação.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Seu WhatsApp com DDD</Text>
                <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border }]}>
                  <MaterialIcons name="chat" size={20} color="#16A34A" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="(00) 00000-0000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    value={whatsapp}
                    onChangeText={handleWhatsappChange}
                    maxLength={15}
                    autoFocus
                  />
                </View>
              </View>

              <View style={[styles.securityBadge, { backgroundColor: isDark ? '#091512' : COLORS.primaryLight, borderColor: isDark ? '#1C362D' : COLORS.primaryBorder }]}>
                <MaterialIcons name="shield" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.securityBadgeText, { color: isDark ? '#34D399' : COLORS.primaryDark }]}>
                  Processo protegido com criptografia de uso único.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleRequestCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Enviar Código por WhatsApp</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Múltiplas contas vinculadas ao mesmo número */}
              {accounts.length > 1 && (
                <View style={[styles.multiAccountBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border }]}>
                  <Text style={[styles.multiAccountTitle, { color: colors.textSecondary }]}>Selecione a conta que deseja redefinir:</Text>
                  {accounts.map((acc) => {
                    const isSelected = selectedAccount?.id === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => setSelectedAccount(acc)}
                        style={[
                          styles.accountOption,
                          { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: colors.border },
                          isSelected && [styles.accountOptionSelected, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : COLORS.primaryLight, borderColor: colors.primary }],
                        ]}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.accountAvatar, isSelected && styles.accountAvatarSelected]}>
                          <Text style={[styles.accountAvatarText, isSelected && styles.accountAvatarTextSelected]}>
                            {acc.name ? acc.name[0].toUpperCase() : 'U'}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.accountName, { color: colors.text }, isSelected && styles.accountNameSelected]} numberOfLines={1}>
                            {acc.name || 'Usuário'}
                          </Text>
                          <Text style={[styles.accountEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                            {acc.maskedEmail || acc.email}
                          </Text>
                        </View>
                        <MaterialIcons
                          name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                          size={20}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ======================================================== */}
          {/* PASSO 2: DIGITAR O CÓDIGO DE 6 DÍGITOS */}
          {/* ======================================================== */}
          {step === 2 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {/* Cabeçalho Compacto do Passo 2 */}
              <View style={[styles.step2Header, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#ECFDF5', borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#DCFCE7' }]}>
                <View style={[styles.miniIconCircle, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7' }]}>
                  <MaterialIcons name="mark-email-read" size={20} color="#16A34A" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.compactCardTitle, { color: colors.text }]}>Código de Confirmação</Text>
                  <Text style={[styles.compactCardSubtitle, { color: colors.textSecondary }]}>Enviado para {maskedPhone}</Text>
                </View>
              </View>

              {/* Campo do Código */}
              <View style={styles.codeInputContainer}>
                <Text style={[styles.codeInputLabel, { color: colors.textSecondary }]}>Digite o código de 6 dígitos:</Text>
                <TextInput
                  style={[styles.codeInput, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', color: colors.text, borderColor: colors.primary }]}
                  placeholder="000000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
                  autoFocus
                />
              </View>

              {/* Seletor de Contas caso mais de uma conta use o mesmo WhatsApp */}
              {accounts.length > 1 && (
                <View style={[styles.multiAccountBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border }]}>
                  <Text style={[styles.multiAccountTitle, { color: colors.textSecondary }]}>Selecione a conta que deseja redefinir:</Text>
                  {accounts.map((acc) => {
                    const isSelected = selectedAccount?.id === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => setSelectedAccount(acc)}
                        style={[
                          styles.accountOption,
                          { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: colors.border },
                          isSelected && [styles.accountOptionSelected, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : COLORS.primaryLight, borderColor: colors.primary }],
                        ]}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.accountAvatar, isSelected && styles.accountAvatarSelected]}>
                          <Text style={[styles.accountAvatarText, isSelected && styles.accountAvatarTextSelected]}>
                            {acc.name ? acc.name[0].toUpperCase() : 'U'}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.accountName, { color: colors.text }, isSelected && styles.accountNameSelected]} numberOfLines={1}>
                            {acc.name || 'Usuário'}
                          </Text>
                          <Text style={[styles.accountEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                            {acc.maskedEmail || acc.email}
                          </Text>
                        </View>
                        <MaterialIcons
                          name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                          size={20}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled, { backgroundColor: colors.primary }]}
                onPress={handleVerifyCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verificar código</Text>
                )}
              </TouchableOpacity>

              {/* Ações Secundárias: Reenviar e Trocar Número */}
              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  onPress={handleRequestCode}
                  disabled={cooldownSeconds > 0 || loading}
                  style={styles.resendButton}
                >
                  <MaterialIcons
                    name="refresh"
                    size={16}
                    color={cooldownSeconds > 0 ? colors.textMuted : colors.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.resendText, { color: colors.primary }, cooldownSeconds > 0 && { color: colors.textMuted }]}>
                    {cooldownSeconds > 0
                      ? `Reenviar código em ${cooldownSeconds}s`
                      : 'Reenviar código por WhatsApp'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setStep(1);
                    setCode('');
                  }}
                  style={styles.changePhoneButton}
                >
                  <Text style={[styles.changePhoneText, { color: colors.textSecondary }]}>Informar outro número</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* PASSO 3: CRIAR A NOVA SENHA */}
          {/* ======================================================== */}
          {step === 3 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}>
                <MaterialIcons name="lock" size={32} color="#D97706" />
              </View>

              <Text style={[styles.cardTitle, { color: colors.text }]}>Criar Nova Senha</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Defina uma senha segura para acessar sua conta WeFIND.
              </Text>

              {/* Campo Nova Senha */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Nova Senha</Text>
                <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border }]}>
                  <MaterialIcons name="lock-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    autoCapitalize="none"
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.eyeButton}
                  >
                    <MaterialIcons
                      name={showPassword ? 'visibility-off' : 'visibility'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Indicador de Força da Senha */}
              {newPassword.length > 0 && (() => {
                const pwdStrength = calculatePasswordStrength(newPassword);
                return (
                  <View style={{ marginBottom: 12, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11.5, color: colors.textSecondary }}>Força da senha:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: pwdStrength.color }}>{pwdStrength.label}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
                      {[1, 2, 3, 4].map((seg) => (
                        <View
                          key={seg}
                          style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: seg <= pwdStrength.level ? pwdStrength.color : (isDark ? '#334155' : '#E2E8F0'),
                          }}
                        />
                      ))}
                    </View>
                    <View style={{ gap: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name={pwdStrength.rules.hasMinLength ? 'check-circle' : 'radio-button-unchecked'} size={13} color={pwdStrength.rules.hasMinLength ? '#10B981' : colors.textMuted} />
                        <Text style={{ fontSize: 11, color: pwdStrength.rules.hasMinLength ? '#059669' : colors.textMuted }}>Mínimo 8 caracteres</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name={pwdStrength.rules.hasNumber ? 'check-circle' : 'radio-button-unchecked'} size={13} color={pwdStrength.rules.hasNumber ? '#10B981' : colors.textMuted} />
                        <Text style={{ fontSize: 11, color: pwdStrength.rules.hasNumber ? '#059669' : colors.textMuted }}>Pelo menos um número</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name={pwdStrength.rules.hasLetters ? 'check-circle' : 'radio-button-unchecked'} size={13} color={pwdStrength.rules.hasLetters ? '#10B981' : colors.textMuted} />
                        <Text style={{ fontSize: 11, color: pwdStrength.rules.hasLetters ? '#059669' : colors.textMuted }}>Letras maiúsculas e minúsculas</Text>
                      </View>
                    </View>
                  </View>
                );
              })()}

              {/* Campo Confirmar Nova Senha */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Confirmar Nova Senha</Text>
                <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border }]}>
                  <MaterialIcons name="lock-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Digite novamente a senha"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    style={styles.eyeButton}
                  >
                    <MaterialIcons
                      name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Feedback de Confirmação */}
              {confirmPassword.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -4, marginBottom: 12, paddingHorizontal: 2 }}>
                  <MaterialIcons
                    name={newPassword === confirmPassword ? 'check-circle' : 'cancel'}
                    size={14}
                    color={newPassword === confirmPassword ? '#10B981' : '#EF4444'}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: newPassword === confirmPassword ? '#059669' : '#EF4444',
                    }}
                  >
                    {newPassword === confirmPassword ? 'As senhas conferem!' : 'As senhas não conferem.'}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  (loading || newPassword.length < 8 || !/[0-9]/.test(newPassword) || newPassword !== confirmPassword) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleSaveNewPassword}
                disabled={loading || newPassword.length < 8 || !/[0-9]/.test(newPassword) || newPassword !== confirmPassword}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Salvar nova senha</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ======================================================== */}
          {/* PASSO 4: SUCESSO / CONFIRMAÇÃO */}
          {/* ======================================================== */}
          {step === 4 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7' }]}>
                <MaterialIcons name="check-circle" size={42} color="#16A34A" />
              </View>

              <Text style={[styles.cardTitle, { color: colors.text }]}>Senha Atualizada!</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Sua senha foi redefinida com segurança. Você já pode fazer login na sua conta com a nova senha.
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else if (user) {
                    navigation.navigate('MainApp');
                  } else {
                    navigation.navigate('Login');
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>
                  {user ? 'Voltar para o Perfil' : 'Ir para o Login'}
                </Text>
                <MaterialIcons name={user ? 'arrow-back' : 'login'} size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 160,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  stepperContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  stepTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 3,
  },
  stepNumber: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 44,
    height: 3,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 6,
    borderRadius: 2,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },
  stepLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  step2Header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  miniIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  compactCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  codeInputContainer: {
    marginTop: 14,
    marginBottom: 16,
  },
  codeInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  highlightPhone: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'center',
  },
  multiAccountBox: {
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  multiAccountTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  accountOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  accountAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarSelected: {
    backgroundColor: COLORS.primary,
  },
  accountAvatarText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 15,
  },
  accountAvatarTextSelected: {
    color: '#FFFFFF',
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  accountNameSelected: {
    color: COLORS.primary,
  },
  accountEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 6,
  },
  codeInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 14,
    height: 56,
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 8,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  securityBadgeText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
  },
  secondaryActions: {
    marginTop: 18,
    alignItems: 'center',
    gap: 12,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  changePhoneButton: {
    padding: 4,
  },
  changePhoneText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  validationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validationText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  validationTextSuccess: {
    color: '#16A34A',
    fontWeight: '700',
  },
});

