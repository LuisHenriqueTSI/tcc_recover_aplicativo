import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { sendPasswordReset } from '../services/supabaseAuth';

export default function EsqueciSenhaScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;

    const timer = setInterval(() => {
      setCooldownSeconds(current => Math.max(current - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Alert.alert('Erro', 'Por favor, informe seu e-mail.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      Alert.alert('Erro', 'Informe um e-mail válido.');
      return;
    }
    if (cooldownSeconds > 0) {
      Alert.alert('Aguarde', `Tente novamente em ${cooldownSeconds} segundo${cooldownSeconds === 1 ? '' : 's'}.`);
      return;
    }

    setLoading(true);
    const error = await sendPasswordReset(normalizedEmail);
    setLoading(false);
    if (!error) {
      setCooldownSeconds(60);
      Alert.alert('Sucesso', 'Verifique seu e-mail para redefinir a senha.');
      navigation.goBack();
    } else {
      const errorMessage = String(error.message || '').toLowerCase();
      if (errorMessage.includes('rate limit')) {
        setCooldownSeconds(60);
        Alert.alert('Limite temporário', 'O serviço de e-mail recusou uma tentativa recente. Aguarde 1 minuto e tente novamente.');
      } else {
        Alert.alert('Erro', error.message || 'Não foi possível enviar o e-mail.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redefinir senha</Text>
      <Text style={styles.label}>Digite seu e-mail cadastrado:</Text>
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading || cooldownSeconds > 0}>
        <Text style={styles.buttonText}>{loading ? 'Enviando...' : cooldownSeconds > 0 ? `Aguarde ${cooldownSeconds}s` : 'Enviar e-mail'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 48,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
