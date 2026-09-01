import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  Platform,
  Keyboard,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import COLORS from '../constants/theme';
import Button from '../components/Button';
import Input from '../components/Input';
import { WeFindText } from '../components/WeFindBrand';
import { getFriendlyAuthErrorMessage } from '../utils/authErrors';

const LoginScreen = ({ navigation }) => {
  const { signIn, loading, user } = useAuth();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

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

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido';
    }

    if (!password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!validateForm()) return;

    try {
      const result = await signIn(email.trim(), password);
      if (result?.user && !result?.user.confirmed_at && !result?.user.email_confirmed_at && !result?.session) {
        Alert.alert(
          'Confirmação necessária',
          'Você precisa confirmar seu cadastro antes de fazer login. Verifique o código de validação no seu WhatsApp.',
        );
        return;
      }
    } catch (error) {
      const friendlyMessage = getFriendlyAuthErrorMessage(error);
      Alert.alert('Acesso não autorizado', friendlyMessage);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        enableResetScrollToCoords={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        extraScrollHeight={Platform.OS === 'ios' ? 40 : 60}
        extraHeight={Platform.OS === 'ios' ? 80 : 100}
        keyboardOpeningTime={0}
      >
        {/* Top App Logo & Brand */}
        <View style={styles.brandHeroContainer}>
          <View style={[styles.logoSquircle, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: isDark ? colors.cardBorder : COLORS.primaryBorder }]}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <WeFindText size={28} uppercase style={{ marginTop: 10, letterSpacing: -0.5 }} />
        </View>

        {/* Title Header */}
        <View style={styles.headerBox}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Acesse sua conta</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Digite seu e-mail e senha para continuar
          </Text>
        </View>

        {/* Form Container */}
        <View style={[styles.formBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.inputWrapper}>
            <Input
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              style={styles.input}
              inputStyle={[
                styles.inputField,
                {
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                  color: colors.text,
                },
              ]}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Input
              label="Senha"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
              }}
              secureTextEntry={true}
              error={errors.password}
              style={styles.input}
              inputStyle={[
                styles.inputField,
                {
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                  color: colors.text,
                },
              ]}
              returnKeyType="done"
            />
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('EsqueciSenha')}
            style={styles.forgotPasswordContainer}
            activeOpacity={0.75}
          >
            <Text style={[styles.forgotPassword, { color: colors.primary }]}>Esqueceu sua senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={styles.loginButtonText}>{loading ? 'Autenticando...' : 'Entrar na Conta'}</Text>
            {!loading && <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />}
          </TouchableOpacity>
        </View>

        {/* Footer Navigation */}
        <View style={styles.footerContainer}>
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Ainda não faz parte? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.75}>
              <Text style={[styles.createAccountText, { color: colors.primary }]}>Criar nova conta</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('PublicApp')}
            style={styles.guestLink}
            activeOpacity={0.7}
          >
            <Text style={[styles.guestLinkText, { color: colors.textMuted }]}>
              Continuar explorando sem login ➔
            </Text>
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
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandHeroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoSquircle: {
    width: 104,
    height: 104,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    padding: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
  },
  formBox: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
  },
  inputWrapper: {
    marginBottom: 4,
  },
  input: {
    marginBottom: 12,
  },
  inputField: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    height: 50,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 18,
    marginTop: 2,
    paddingVertical: 2,
  },
  forgotPassword: {
    fontSize: 13,
    fontWeight: '700',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    fontWeight: '800',
    fontSize: 15.5,
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 22,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  createAccountText: {
    fontWeight: '800',
    fontSize: 14,
  },
  guestLink: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  guestLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});

export default LoginScreen;
