import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStatistics } from '../services/statistics';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'react-native';

const PRIMARY = '#4F46E5';
const BG_CARD = '#F3F4F6';

const SobreScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStatistics().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  const handleAccept = async () => {
    await AsyncStorage.setItem('accepted_terms', 'true');
    navigation.replace('PublicApp');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoBox}>
        <Image source={require('../assets/logo_recover.png')} style={styles.logoImg} resizeMode="contain" />
      </View>
      {/* <Text style={styles.title}>Recover</Text> */}
      <Text style={styles.subtitle}>Reconectando pessoas às suas memórias perdidas</Text>
      <Text style={styles.desc}>
        Encontre animais, objetos, documentos e muito mais. Nossa comunidade ajuda milhares de pessoas todos os dias.
      </Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <MaterialIcons name="favorite-border" size={28} color={PRIMARY} />
          <Text style={styles.statValue}>{stats ? (stats.items_resolved || stats.itemsReturned || 0) : '--'}</Text>
          <Text style={styles.statLabel}>Itens recuperados</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="place" size={28} color={PRIMARY} />
          <Text style={styles.statValue}>{stats ? (stats.total_items || stats.items_found || 0) : '--'}</Text>
          <Text style={styles.statLabel}>Localizações</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="groups" size={28} color={PRIMARY} />
          <Text style={styles.statValue}>{stats ? (stats.total_users || stats.activeUsers || 0) : '--'}</Text>
          <Text style={styles.statLabel}>Usuários ativos</Text>
        </View>
      </View>
      <View style={{ flex: 1, minHeight: 40 }} />
      <TouchableOpacity style={styles.button} onPress={handleAccept}>
        <Text style={styles.buttonText}>Começar agora</Text>
        <MaterialIcons name="arrow-forward-ios" size={18} color="#fff" style={{ marginLeft: 6 }} />
      </TouchableOpacity>
      <Text style={styles.termsText}>
        Ao continuar, você concorda com nossos{' '}
        <Text style={styles.link} onPress={() => Linking.openURL('https://recover.com/termos')}>Termos de Uso</Text>
        {' '}e{' '}
        <Text style={styles.link} onPress={() => Linking.openURL('https://recover.com/privacidade')}>Política de Privacidade</Text>
        .
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 24,
    paddingTop: 64,
    backgroundColor: '#fff',
  },
  logoBox: {
    marginBottom: 12,
    alignItems: 'center',
  },
  logoImg: {
    width: 220,
    height: 220,
    alignSelf: 'center',
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '500',
  },
  desc: {
    fontSize: 15,
    color: '#444',
    textAlign: 'center',
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 28,
    width: '100%',
  },
  statCard: {
    backgroundColor: BG_CARD,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginHorizontal: 6,
    flex: 1,
    minWidth: 90,
    maxWidth: 120,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 10,
    marginBottom: 18,
    shadowColor: PRIMARY,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  termsText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  link: {
    color: PRIMARY,
    textDecorationLine: 'underline',
  },
});

export default SobreScreen;
