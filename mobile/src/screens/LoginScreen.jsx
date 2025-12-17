import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';

const LoginScreen = ({ navigation }) => {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!email) {
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
    if (!validateForm()) return;

    try {
      await signIn(email, password);
      navigation.reset({
        index: 0,
        routes: [
          { name: 'MainApp' }
        ],
      });
    } catch (error) {
      Alert.alert('Erro de Login', error.message || 'Falha ao fazer login');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>RECOVER</Text>
        <Text style={styles.title}>Entrar</Text>
      </View>

      <Card style={styles.card}>
        <Input
          label="Email"
          placeholder="seu@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          error={errors.email}
          style={styles.input}
        />

        <Input
          label="Senha"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
          error={errors.password}
          style={styles.input}
        />

        <Button
          title={loading ? 'Entrando...' : 'Entrar'}
          onPress={handleLogin}
          disabled={loading}
          loading={loading}
          style={styles.button}
        />

        <Text style={styles.divider}>ou</Text>

        <Button
          title="Recuperar Senha"
          variant="secondary"
          onPress={() => navigation.navigate('ResetPassword')}
          style={styles.button}
        />
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Não tem conta? </Text>
        <Button
          title="Cadastrar-se"
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#4F46E5',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 18,
    color: '#E0E7FF',
    marginTop: 8,
  },
  card: {
    marginTop: 20,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  divider: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginVertical: 16,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#6B7280',
    marginBottom: 8,
  },
});

export default LoginScreen;
