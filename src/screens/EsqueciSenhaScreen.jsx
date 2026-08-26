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

export default function EsqueciSenhaScreen({ navigation }) {
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
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Senha Curta', 'A nova senha deve conter pelo menos 6 caracteres.');
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
              } else {
                navigation.goBack();
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
          contentContainerStyle={styles.scrollContent}
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
                    step >= 1 && styles.stepIndicatorActive,
                  ]}
                >
                  <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>1</Text>
                </View>
                <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
                <View
                  style={[
                    styles.stepIndicator,
                    step >= 2 && styles.stepIndicatorActive,
                  ]}
                >
                  <Text style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}>2</Text>
                </View>
                <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
                <View
                  style={[
                    styles.stepIndicator,
                    step >= 3 && styles.stepIndicatorActive,
                  ]}
                >
                  <Text style={[styles.stepNumber, step >= 3 && styles.stepNumberActive]}>3</Text>
                </View>
              </View>
              <Text style={styles.stepLabel}>
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
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="phone-android" size={32} color="#2563EB" />
              </View>

              <Text style={styles.cardTitle}>Recuperar Acesso</Text>
              <Text style={styles.cardSubtitle}>
                Informe o número de WhatsApp cadastrado na sua conta para enviarmos um código de verificação.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Seu WhatsApp com DDD</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="chat" size={20} color="#16A34A" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="(00) 00000-0000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={whatsapp}
                    onChangeText={handleWhatsappChange}
                    maxLength={15}
                    autoFocus
                  />
                </View>
              </View>

              <View style={styles.securityBadge}>
                <MaterialIcons name="shield" size={18} color="#2563EB" style={{ marginRight: 8 }} />
                <Text style={styles.securityBadgeText}>
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
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Receber código no WhatsApp</Text>
                    <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ======================================================== */}
          {/* PASSO 2: DIGITAR O CÓDIGO DE 6 DÍGITOS */}
          {/* ======================================================== */}
          {step === 2 && (
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                <MaterialIcons name="mark-email-read" size={32} color="#16A34A" />
              </View>

              <Text style={styles.cardTitle}>Código de Confirmação</Text>
              <Text style={styles.cardSubtitle}>
                Enviamos um código de 6 dígitos no WhatsApp para:
              </Text>
              <Text style={styles.highlightPhone}>{maskedPhone}</Text>

              {/* Seletor de Contas caso mais de uma conta use o mesmo WhatsApp */}
              {accounts.length > 1 && (
                <View style={styles.multiAccountBox}>
                  <Text style={styles.multiAccountTitle}>Selecione a conta que deseja redefinir:</Text>
                  {accounts.map((acc) => {
                    const isSelected = selectedAccount?.id === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => setSelectedAccount(acc)}
                        style={[styles.accountOption, isSelected && styles.accountOptionSelected]}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.accountAvatar, isSelected && styles.accountAvatarSelected]}>
                          <Text style={[styles.accountAvatarText, isSelected && styles.accountAvatarTextSelected]}>
                            {acc.name ? acc.name[0].toUpperCase() : 'U'}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.accountName, isSelected && styles.accountNameSelected]} numberOfLines={1}>
                            {acc.name || 'Usuário'}
                          </Text>
                          <Text style={styles.accountEmail} numberOfLines={1}>
                            {acc.maskedEmail || acc.email}
                          </Text>
                        </View>
                        <MaterialIcons
                          name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                          size={20}
                          color={isSelected ? '#2563EB' : '#94A3B8'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Código de 6 dígitos</Text>
                <TextInput
                  style={styles.codeInput}
                  placeholder="000000"
                  placeholderTextColor="#CBD5E1"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
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
                    color={cooldownSeconds > 0 ? '#94A3B8' : '#2563EB'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.resendText, cooldownSeconds > 0 && { color: '#94A3B8' }]}>
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
                  <Text style={styles.changePhoneText}>Informar outro número</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* PASSO 3: CRIAR A NOVA SENHA */}
          {/* ======================================================== */}
          {step === 3 && (
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                <MaterialIcons name="lock" size={32} color="#D97706" />
              </View>

              <Text style={styles.cardTitle}>Criar Nova Senha</Text>
              <Text style={styles.cardSubtitle}>
                Defina uma senha segura para acessar sua conta WeFIND.
              </Text>

              {/* Campo Nova Senha */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nova Senha</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#94A3B8"
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
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Campo Confirmar Nova Senha */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirmar Nova Senha</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Digite novamente a senha"
                    placeholderTextColor="#94A3B8"
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
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Checklist de Validações em Tempo Real */}
              <View style={styles.validationBox}>
                <View style={styles.validationRow}>
                  <MaterialIcons
                    name={newPassword.length >= 6 ? 'check-circle' : 'radio-button-unchecked'}
                    size={16}
                    color={newPassword.length >= 6 ? '#16A34A' : '#94A3B8'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.validationText,
                      newPassword.length >= 6 && styles.validationTextSuccess,
                    ]}
                  >
                    Pelo menos 6 caracteres
                  </Text>
                </View>

                <View style={styles.validationRow}>
                  <MaterialIcons
                    name={
                      newPassword && newPassword === confirmPassword
                        ? 'check-circle'
                        : 'radio-button-unchecked'
                    }
                    size={16}
                    color={
                      newPassword && newPassword === confirmPassword ? '#16A34A' : '#94A3B8'
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.validationText,
                      newPassword &&
                        newPassword === confirmPassword &&
                        styles.validationTextSuccess,
                    ]}
                  >
                    As duas senhas são iguais
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (loading || newPassword.length < 6 || newPassword !== confirmPassword) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleSaveNewPassword}
                disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
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
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                <MaterialIcons name="check-circle" size={42} color="#16A34A" />
              </View>

              <Text style={styles.cardTitle}>Senha Atualizada!</Text>
              <Text style={styles.cardSubtitle}>
                Sua senha foi redefinida com segurança. Você já pode fazer login na sua conta com a nova senha.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Ir para o Login</Text>
                <MaterialIcons name="login" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
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
    backgroundColor: '#2563EB',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#2563EB',
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
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  stepperContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
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
    backgroundColor: '#2563EB',
  },
  stepLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
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
    color: '#2563EB',
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
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
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
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
    backgroundColor: '#2563EB',
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
    color: '#2563EB',
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
    borderColor: '#2563EB',
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
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  securityBadgeText: {
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
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
    color: '#2563EB',
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

