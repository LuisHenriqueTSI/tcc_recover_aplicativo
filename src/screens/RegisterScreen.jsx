import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  Keyboard,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import Input from '../components/Input';

const formatBrazilianPhone = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const calculatePasswordStrength = (pwd = '') => {
  const hasMinLength = pwd.length >= 8;
  const hasUpperCase = /[A-Z]/.test(pwd);
  const hasLowerCase = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);

  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (hasMinLength) score += 1;
  if (hasUpperCase && hasLowerCase) score += 1;
  if (hasNumber) score += 1;
  if (hasSpecial) score += 1;

  let label = 'Muito fraca';
  let color = '#EF4444';
  let level = 1;

  if (score <= 1) {
    label = 'Muito fraca';
    color = '#EF4444';
    level = 1;
  } else if (score === 2) {
    label = 'Fraca';
    color = '#F97316';
    level = 2;
  } else if (score === 3) {
    label = 'Boa';
    color = '#F59E0B';
    level = 3;
  } else if (score >= 4) {
    label = 'Forte e segura 🛡️';
    color = '#10B981';
    level = 4;
  }

  const isValid = hasMinLength && (hasUpperCase || hasLowerCase) && hasNumber;

  return {
    score,
    level,
    label,
    color,
    isValid,
    rules: {
      hasMinLength,
      hasLetters: hasUpperCase && hasLowerCase,
      hasNumber,
      hasSpecial,
    },
  };
};

const RegisterScreen = ({ navigation }) => {
  const { signUp, confirmSignUp, loading, user } = useAuth();
  const { colors, isDark } = useTheme();

  // Captura o botão físico de voltar do Android e redireciona para a tela inicial
  useFocusEffect(
    useCallback(() => {
      const onHardwareBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: user ? 'MainApp' : 'PublicApp' }],
          });
        }
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
      return () => subscription.remove();
    }, [navigation, user])
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(true);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingSignupData, setPendingSignupData] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const scrollRef = useRef(null);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido';
    }
    if (!password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (password.length < 8) {
      newErrors.password = 'A senha deve ter no mínimo 8 caracteres';
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = 'A senha deve conter pelo menos um número';
    } else if (!/[A-Za-z]/.test(password)) {
      newErrors.password = 'A senha deve conter pelo menos uma letra';
    }
    if (!whatsapp.trim()) {
      newErrors.whatsapp = 'WhatsApp é obrigatório';
    } else if (!/^\d{10,15}$/.test(whatsapp.replace(/\D/g, ''))) {
      newErrors.whatsapp = 'WhatsApp inválido';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Senhas não conferem';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    Keyboard.dismiss();

    if (pendingVerification) {
      if (!verificationCode.trim()) {
        Alert.alert('Código necessário', 'Informe o código enviado para o WhatsApp.');
        return;
      }

      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        await confirmSignUp({
          email: email.trim(),
          password,
          name: name.trim(),
          city: '',
          state: '',
          whatsapp: whatsapp.replace(/\D/g, ''),
          whatsapp_notifications_enabled: whatsappConsent,
          verificationCode: verificationCode.trim(),
        });
        Alert.alert('Conta criada com sucesso!', 'Seja bem-vindo ao WeFIND. Faça login para começar.');
        setPendingVerification(false);
        setVerificationCode('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setWhatsapp('');
        setName('');
        navigation.navigate('Login');
      } catch (error) {
        Alert.alert('Erro de Cadastro', error?.message || 'Falha ao confirmar o código.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!validateForm()) return;
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const result = await signUp(
        email.trim(),
        password,
        name.trim(),
        '',
        '',
        whatsapp.replace(/\D/g, ''),
        whatsappConsent
      );
      if (result?.pendingVerification) {
        setPendingVerification(true);
        setPendingSignupData(result);
        setResendCooldown(30);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd?.(true);
        }, 250);
        if (result?.devCode) {
          Alert.alert(
            'Código de Confirmação',
            `Código de verificação para testes: ${result.devCode}\n\n(Aviso Twilio Sandbox: para o WhatsApp ser entregue em outros números, eles precisam entrar no sandbox da Twilio).`
          );
        } else {
          Alert.alert('Código enviado', `Enviamos um código para o WhatsApp ${whatsapp}. Informe-o abaixo para concluir o cadastro.`);
        }
      }
    } catch (error) {
      Alert.alert('Erro de Cadastro', error?.message || 'Falha ao criar conta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isSubmitting) return;

    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      const result = await signUp(
        email.trim(),
        password,
        name.trim(),
        '',
        '',
        whatsapp.replace(/\D/g, ''),
        whatsappConsent
      );
      setResendCooldown(45);
      if (result?.devCode) {
        Alert.alert(
          'Novo Código Gerado',
          `Novo código de verificação para testes: ${result.devCode}`
        );
      } else {
        Alert.alert('Código Reenviado', `Um novo código foi enviado para o WhatsApp ${formatBrazilianPhone(whatsapp)}.`);
      }
    } catch (error) {
      Alert.alert('Erro ao Reenviar', error?.message || 'Não foi possível reenviar o código agora.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelVerification = () => {
    setPendingVerification(false);
    setVerificationCode('');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: pendingVerification ? 140 : 60 }
        ]}
        enableOnAndroid={true}
        enableResetScrollToCoords={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        extraScrollHeight={Platform.OS === 'ios' ? 80 : 120}
        extraHeight={Platform.OS === 'ios' ? 120 : 160}
        keyboardOpeningTime={0}
      >
        {/* Logo Circular */}
        <View style={[styles.circularLogoContainer, { backgroundColor: colors.card, borderColor: isDark ? colors.cardBorder : '#EFF6FF' }]}>
          <Image
            source={require('../assets/logo_wefind.png')}
            style={styles.circularLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerBox}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Criar sua conta</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Junte-se à nossa comunidade de proteção animal</Text>
        </View>

        <View style={[styles.formBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Input
            label="Nome Completo"
            placeholder="Ex: João da Silva"
            value={name}
            onChangeText={setName}
            error={errors.name}
            editable={!pendingVerification}
            style={styles.input}
            inputStyle={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
            returnKeyType="next"
          />

          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!pendingVerification}
            error={errors.email}
            style={styles.input}
            inputStyle={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
            returnKeyType="next"
          />

          <Input
            label="WhatsApp (com DDD)"
            placeholder="(11) 99999-9999"
            value={formatBrazilianPhone(whatsapp)}
            onChangeText={text => setWhatsapp(text.replace(/\D/g, ''))}
            keyboardType="phone-pad"
            editable={!pendingVerification}
            error={errors.whatsapp || errors.phone}
            style={styles.input}
            inputStyle={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
            returnKeyType="next"
          />

          <Input
            label="Senha"
            placeholder="Crie uma senha forte (mín. 8 caracteres)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            editable={!pendingVerification}
            error={errors.password}
            style={styles.input}
            inputStyle={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
            returnKeyType="next"
          />

          {/* INDICADOR DE FORÇA DA SENHA EM TEMPO REAL */}
          {password.length > 0 && !pendingVerification && (() => {
            const pwdStrength = calculatePasswordStrength(password);
            return (
              <View style={[styles.passwordStrengthBox, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#F8FAFC', borderColor: colors.cardBorder }]}>
                {/* Linha com classificação de força */}
                <View style={styles.strengthHeaderRow}>
                  <Text style={[styles.strengthLabelTitle, { color: colors.textSecondary }]}>Força da senha:</Text>
                  <Text style={[styles.strengthBadgeText, { color: pwdStrength.color }]}>{pwdStrength.label}</Text>
                </View>

                {/* Barra de 4 segmentos */}
                <View style={styles.strengthBarRow}>
                  {[1, 2, 3, 4].map((seg) => (
                    <View
                      key={seg}
                      style={[
                        styles.strengthBarSegment,
                        {
                          backgroundColor: seg <= pwdStrength.level ? pwdStrength.color : (isDark ? '#334155' : '#E2E8F0'),
                        },
                      ]}
                    />
                  ))}
                </View>

                {/* Critérios em Tempo Real */}
                <View style={styles.criteriaContainer}>
                  <View style={styles.criteriaItem}>
                    <MaterialIcons
                      name={pwdStrength.rules.hasMinLength ? 'check-circle' : 'radio-button-unchecked'}
                      size={14}
                      color={pwdStrength.rules.hasMinLength ? '#10B981' : colors.textMuted}
                    />
                    <Text style={[styles.criteriaText, { color: pwdStrength.rules.hasMinLength ? (isDark ? '#34D399' : '#059669') : colors.textMuted }]}>
                      Pelo menos 8 caracteres
                    </Text>
                  </View>

                  <View style={styles.criteriaItem}>
                    <MaterialIcons
                      name={pwdStrength.rules.hasLetters ? 'check-circle' : 'radio-button-unchecked'}
                      size={14}
                      color={pwdStrength.rules.hasLetters ? '#10B981' : colors.textMuted}
                    />
                    <Text style={[styles.criteriaText, { color: pwdStrength.rules.hasLetters ? (isDark ? '#34D399' : '#059669') : colors.textMuted }]}>
                      Letras maiúsculas e minúsculas
                    </Text>
                  </View>

                  <View style={styles.criteriaItem}>
                    <MaterialIcons
                      name={pwdStrength.rules.hasNumber ? 'check-circle' : 'radio-button-unchecked'}
                      size={14}
                      color={pwdStrength.rules.hasNumber ? '#10B981' : colors.textMuted}
                    />
                    <Text style={[styles.criteriaText, { color: pwdStrength.rules.hasNumber ? (isDark ? '#34D399' : '#059669') : colors.textMuted }]}>
                      Pelo menos um número (0-9)
                    </Text>
                  </View>

                  <View style={styles.criteriaItem}>
                    <MaterialIcons
                      name={pwdStrength.rules.hasSpecial ? 'check-circle' : 'radio-button-unchecked'}
                      size={14}
                      color={pwdStrength.rules.hasSpecial ? '#10B981' : colors.textMuted}
                    />
                    <Text style={[styles.criteriaText, { color: pwdStrength.rules.hasSpecial ? (isDark ? '#34D399' : '#059669') : colors.textMuted }]}>
                      Caractere especial (!@#$...) (opcional)
                    </Text>
                  </View>
                </View>
              </View>
            );
          })()}

          <Input
            label="Confirmar Senha"
            placeholder="Repita sua senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={true}
            editable={!pendingVerification}
            error={errors.confirmPassword}
            style={styles.input}
            inputStyle={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
            returnKeyType="done"
          />

          {/* Feedback de Confirmação de Senha em Tempo Real */}
          {confirmPassword.length > 0 && !pendingVerification && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -6, marginBottom: 12, paddingHorizontal: 2 }}>
              <MaterialIcons
                name={password === confirmPassword ? 'check-circle' : 'cancel'}
                size={14}
                color={password === confirmPassword ? '#10B981' : '#EF4444'}
                style={{ marginRight: 5 }}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: password === confirmPassword ? (isDark ? '#34D399' : '#059669') : '#EF4444',
                }}
              >
                {password === confirmPassword ? 'As senhas conferem!' : 'As senhas não conferem.'}
              </Text>
            </View>
          )}

          {/* Checkbox de Consentimento de Notificações por WhatsApp */}
          {!pendingVerification && (
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setWhatsappConsent(prev => !prev)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }, whatsappConsent && styles.checkboxChecked]}>
                {whatsappConsent ? <MaterialIcons name="check" size={16} color="#FFFFFF" /> : null}
              </View>
              <Text style={[styles.consentText, { color: colors.textSecondary }]}>
                Desejo receber avisos e notificações de novas informações de animais no meu WhatsApp
              </Text>
            </TouchableOpacity>
          )}

          {pendingVerification ? (
            <View style={[styles.verificationBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFF7ED', borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDBA74' }]}>
              <View style={styles.verificationHeader}>
                <Text style={[styles.verificationTitle, { color: isDark ? '#FBBF24' : '#C2410C' }]}>🔐 Verificação por WhatsApp</Text>
                <TouchableOpacity onPress={handleCancelVerification} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.editDataText, { color: colors.primary }]}>Editar dados</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.verificationDesc, { color: isDark ? '#FDE68A' : '#7C2D12' }]}>
                Enviamos um código de 6 dígitos para o WhatsApp <Text style={{ fontWeight: 'bold' }}>{formatBrazilianPhone(whatsapp)}</Text>:
              </Text>

              <Input
                label="Código de verificação"
                placeholder="123456"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                style={styles.input}
                inputStyle={[styles.inputField, styles.codeInputField, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', color: colors.text }]}
                onFocus={() => {
                  scrollRef.current?.scrollToEnd?.(true);
                }}
              />

              {/* Botão de Reenviar Código */}
              <View style={styles.resendContainer}>
                <Text style={[styles.resendQuestion, { color: isDark ? '#FDE68A' : '#9A3412' }]}>Não recebeu o código?</Text>
                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={isSubmitting || resendCooldown > 0}
                  activeOpacity={0.7}
                  style={styles.resendButton}
                >
                  <Feather
                    name="refresh-cw"
                    size={14}
                    color={resendCooldown > 0 ? colors.textMuted : colors.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.resendText, { color: colors.primary }, resendCooldown > 0 && { color: colors.textMuted }]}>
                    {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código no WhatsApp'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <Button
            title={isSubmitting ? 'Processando...' : pendingVerification ? 'Confirmar código' : 'Cadastrar'}
            onPress={handleRegister}
            disabled={isSubmitting}
            loading={isSubmitting}
            style={[styles.registerButton, { backgroundColor: colors.primary }]}
            textStyle={styles.registerButtonText}
          />
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Já tem uma conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
            <Text style={[styles.createAccountText, { color: colors.primary }]}>Fazer login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularLogoContainer: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 10,
  },
  circularLogo: {
    width: '100%',
    height: '100%',
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  formBox: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
  },
  input: {
    marginBottom: 12,
  },
  inputField: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    height: 48,
  },
  passwordStrengthBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: -4,
    marginBottom: 14,
  },
  strengthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthLabelTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  strengthBadgeText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  strengthBarRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 8,
  },
  strengthBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  criteriaContainer: {
    gap: 3,
    marginTop: 2,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  criteriaText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  codeInputField: {
    borderColor: '#FDBA74',
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 6,
    fontWeight: 'bold',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  consentText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
  },
  verificationBox: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  verificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  verificationTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  editDataText: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  verificationDesc: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  resendContainer: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendQuestion: {
    fontSize: 12,
    marginBottom: 4,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  registerButton: {
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 2,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  registerButtonText: {
    fontWeight: '800',
    fontSize: 15.5,
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 14,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  createAccountText: {
    fontWeight: '800',
    fontSize: 14,
  },
});

export default RegisterScreen;
