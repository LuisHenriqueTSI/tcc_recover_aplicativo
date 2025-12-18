import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import * as itemsService from '../services/items';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';

const WelcomeScreen = ({ navigation }) => {
  const { signIn } = useAuth();
  const [statistics, setStatistics] = useState({
    itemsResolved: 0,
    animalsReunited: 0,
    peopleConnected: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const stats = await itemsService.getResolvedStatistics();
      setStatistics({
        itemsResolved: stats.total_resolved || 0,
        animalsReunited: stats.animalsReunited || 0,
        peopleConnected: stats.peopleConnected || 0,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../assets/logo_recover.png')} style={styles.logoImg} resizeMode="contain" />
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        {/* <Text style={styles.heroTitle}>Bem-vindo ao RECOVER</Text> */}
        <Text style={styles.heroDescription}>
          Ajudamos pessoas a encontrar itens perdidos e conectar quem achou com quem procura
        </Text>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Carregando estatísticas...</Text>
          </View>
        ) : (
          <>
            <Card style={styles.statCard}>
              <Text style={styles.statNumber}>
                {statistics.itemsResolved > 0 ? `${statistics.itemsResolved.toLocaleString('pt-BR')}+` : '0'}
              </Text>
              <Text style={styles.statLabel}>Itens Resolvidos</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statNumber}>
                {statistics.animalsReunited > 0 ? `${statistics.animalsReunited.toLocaleString('pt-BR')}+` : '0'}
              </Text>
              <Text style={styles.statLabel}>Animais Reunidos</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statNumber}>
                {statistics.peopleConnected > 0 ? `${statistics.peopleConnected.toLocaleString('pt-BR')}+` : '0'}
              </Text>
              <Text style={styles.statLabel}>Pessoas Conectadas</Text>
            </Card>
          </>
        )}
      </View>

      {/* How it Works */}
      <View style={styles.howItWorks}>
        <Text style={styles.sectionTitle}>Como Funciona</Text>
        
        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Registre o Item</Text>
            <Text style={styles.stepDescription}>
              Descreva o item perdido ou encontrado com detalhes
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Compartilhe</Text>
            <Text style={styles.stepDescription}>
              Sua publicação é vista por outros usuários na plataforma
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Se Conecte</Text>
            <Text style={styles.stepDescription}>
              Comunique-se com outros usuários até resolver o caso
            </Text>
          </View>
        </View>
      </View>

      {/* Testimonials */}
      <View style={styles.testimonials}>
        <Text style={styles.sectionTitle}>Depoimentos</Text>
        
        <Card>
          <Text style={styles.testimonialText}>
            "Perdi minha carteira e consegui recuperar em 2 dias!"
          </Text>
          <Text style={styles.testimonialAuthor}>- João Silva</Text>
        </Card>

        <Card>
          <Text style={styles.testimonialText}>
            "Achei um celular na rua e consegui devolver para o dono"
          </Text>
          <Text style={styles.testimonialAuthor}>- Maria Santos</Text>
        </Card>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="Ver Itens"
          variant="secondary"
          onPress={() => navigation.navigate('PublicApp')}
          style={styles.button}
        />
        <Button
          title="Entrar"
          onPress={() => navigation.navigate('Login')}
          style={styles.button}
        />
        <Button
          title="Cadastrar-se"
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
          style={styles.button}
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
    paddingTop: 10,
    alignItems: 'center',
  },
  logoImg: {
    width: 220,
    height: 220,
    alignSelf: 'center',
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
  subtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    marginTop: 4,
  },
  heroSection: {
    padding: 20,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  howItWorks: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  stepDescription: {
    color: '#6B7280',
    fontSize: 14,
  },
  testimonials: {
    padding: 20,
  },
  testimonialText: {
    fontSize: 14,
    color: '#1F2937',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  testimonialAuthor: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  actionButtons: {
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    width: '100%',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default WelcomeScreen;
