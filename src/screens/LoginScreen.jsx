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
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import Input from '../components/Input';
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
        <View style={[styles.circularLogoContainer, { backgroundColor: colors.card, borderColor: isDark ? colors.cardBorder : '#EFF6FF' }]}>
          <Image
            source={require('../assets/logo_wefind.png')}
            style={styles.circularLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerBox}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Bem-vindo de volta</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Acesse sua conta para continuar</Text>
        </View>

        <View style={[styles.formBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            style={styles.input}
            inputStyle={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
            returnKeyType="next"
          />

          <Input
            label="Senha"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            error={errors.password}
            style={styles.input}
            inputStyle={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
            returnKeyType="done"
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('EsqueciSenha')}
            style={styles.forgotPasswordContainer}
            activeOpacity={0.7}
          >
            <Text style={[styles.forgotPassword, { color: colors.primary }]}>Esqueceu sua senha?</Text>
          </TouchableOpacity>

          <Button
            title={loading ? 'Entrando...' : 'Entrar'}
            onPress={handleLogin}
            disabled={loading}
            loading={loading}
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            textStyle={styles.loginButtonText}
          />
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Não tem uma conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
            <Text style={[styles.createAccountText, { color: colors.primary }]}>Criar conta</Text>
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
    paddingTop: 20,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 14,
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
    marginBottom: 3,
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
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: 2,
  },
  forgotPassword: {
    fontSize: 13,
    fontWeight: '700',
  },
  loginButton: {
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  loginButtonText: {
    fontWeight: '800',
    fontSize: 15.5,
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
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

export default LoginScreen;
