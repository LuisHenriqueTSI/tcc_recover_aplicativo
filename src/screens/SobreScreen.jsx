import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

const SobreScreen = ({ navigation }) => {
  const handleStart = async () => {
    await AsyncStorage.setItem('accepted_terms', 'true');
    navigation.replace('PublicApp');
  };

  const handleLoginDirect = async () => {
    await AsyncStorage.setItem('accepted_terms', 'true');
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        {/* Logo Circular em Destaque */}
        <View style={styles.logoSection}>
          <View style={styles.circularLogoContainer}>
            <Image
              source={require('../assets/logo_wefind.png')}
              style={styles.circularLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Mensagem Natural e Humana */}
        <View style={styles.textSection}>
          <Text style={styles.headline}>
            Cada pet tem uma história e uma família esperando por ele.
          </Text>
          <Text style={styles.subheadline}>
            Conectamos quem perdeu e quem encontrou um animalzinho, de forma simples, rápida e acolhedora.
          </Text>
        </View>

        {/* Botões de Ação */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStart}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryButtonText}>Começar a Explorar</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleLoginDirect}
            activeOpacity={0.75}
          >
            <Text style={styles.secondaryButtonText}>
              Já tem uma conta? <Text style={styles.loginLink}>Entrar</Text>
            </Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            Ao continuar, você concorda com nossos{' '}
            <Text style={styles.link} onPress={() => Linking.openURL('https://wefind.app/termos')}>
              Termos de Uso
            </Text>
            {' '}e{' '}
            <Text style={styles.link} onPress={() => Linking.openURL('https://wefind.app/privacidade')}>
              Privacidade
            </Text>
            .
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  circularLogoContainer: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3.5,
    borderColor: '#EFF6FF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 6,
  },
  circularLogo: {
    width: '100%',
    height: '100%',
  },
  textSection: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginVertical: 12,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 12,
  },
  subheadline: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  actionSection: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  loginLink: {
    color: '#2563EB',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  termsText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },
  link: {
    color: '#2563EB',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default SobreScreen;
