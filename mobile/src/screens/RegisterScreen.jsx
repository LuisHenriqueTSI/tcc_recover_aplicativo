import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';

const RegisterScreen = ({ navigation }) => {
  const { signUp, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
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
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Senhas não conferem';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      await signUp(email, password, name);
      Alert.alert(
        'Sucesso',
        'Conta criada! Por favor, confirme seu email e faça login.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro de Cadastro', error.message || 'Falha ao criar conta');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>RECOVER</Text>
        <Text style={styles.title}>Cadastro</Text>
      </View>

      <Card style={styles.card}>
        <Input
          label="Nome Completo"
          placeholder="Seu Nome"
          value={name}
          onChangeText={setName}
          error={errors.name}
          style={styles.input}
        />

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

        <Input
          label="Confirmar Senha"
          placeholder="••••••••"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={true}
          error={errors.confirmPassword}
          style={styles.input}
        />

        <Button
          title={loading ? 'Criando conta...' : 'Cadastrar-se'}
          onPress={handleRegister}
          disabled={loading}
          loading={loading}
          style={styles.button}
        />
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Já tem conta? </Text>
        <Button
          title="Fazer Login"
          variant="secondary"
          onPress={() => navigation.navigate('Login')}
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
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
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

export default RegisterScreen;
