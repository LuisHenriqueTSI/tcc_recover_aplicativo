import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { dispatchSystemNotificationToWhatsApp } from './whatsappNotifications';

// Configuração do comportamento das notificações quando o app está aberto em primeiro plano (Foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const PUSH_TOKEN_STORAGE_KEY = '@wefind/expo_push_token';
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

// Cálculo de distância geográfica precisa em KM (Fórmula de Haversine)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

  const R = 6371; // Raio da Terra em km
  const dLat = (numLat2 - numLat1) * (Math.PI / 180);
  const dLon = (numLon2 - numLon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(numLat1 * (Math.PI / 180)) *
      Math.cos(numLat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Registra o dispositivo para receber Push Notifications do Expo
 * e armazena o token no perfil do usuário no Supabase e no AsyncStorage.
 */
export async function registerForPushNotificationsAsync(userId = null) {
  try {
    // Configura canal de notificação de alta prioridade no Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('wefind-lost-pets', {
        name: 'Alertas de Pets Perdidos e Mensagens',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    // Solicita permissão do usuário
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permissão de notificação não concedida.');
      return null;
    }

    // Obtém o token Expo Push
    let tokenData = null;
    try {
      tokenData = await Notifications.getExpoPushTokenAsync();
    } catch (tokenErr) {
      console.warn('[PushNotifications] Aviso ao obter expo push token:', tokenErr.message);
    }

    const token = tokenData?.data || null;
    if (token) {
      console.log('[PushNotifications] ✓ Expo Push Token registrado:', token);
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

      // Salva no perfil do Supabase se o usuário estiver autenticado
      if (userId) {
        try {
          await supabase
            .from('profiles')
            .update({
              expo_push_token: token,
              extra_fields: {
                expo_push_token: token,
              },
            })
            .eq('id', userId);
        } catch (dbErr) {
          console.warn('[PushNotifications] Aviso ao salvar token no Supabase:', dbErr.message);
        }
      }
    }

    return token;
  } catch (error) {
    console.warn('[PushNotifications] Erro geral ao registrar push notifications:', error.message);
    return null;
  }
}

/**
 * Dispara notificação push através da API oficial do Expo
 */
export async function sendExpoPushNotification({ to, title, body, data = {} }) {
  if (!to) return false;

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) return false;

  const messages = recipients.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'wefind-lost-pets',
    _displayInForeground: true,
  }));

  try {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('[PushNotifications] Resposta do envio Expo:', result);
    return true;
  } catch (error) {
    console.warn('[PushNotifications] Erro ao enviar push via Expo:', error.message);
    return false;
  }
}

/**
 * Dispara uma notificação local instantânea no aparelho (ótimo para testes e feedback em tempo real)
 */
export async function triggerLocalNotification({ title, body, data = {} }) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // Dispara imediatamente
    });
    return true;
  } catch (error) {
    console.warn('[PushNotifications] Erro ao agendar notificação local:', error.message);
    return false;
  }
}

/**
 * ALERTA COMUNITÁRIO GEOLOCALIZADO DE PET PERDIDO:
 * Disparado quando um tutor registra a perda de um animal.
 * Notifica todos os usuários e voluntários situados no raio de busca daquele epicentro.
 */
export async function broadcastLostPetAlertToNearbyUsers(petItem, currentUserId = null) {
  if (!petItem) return { notifiedCount: 0 };

  console.log('[broadcastLostPetAlert] 🚨 Iniciando alerta de proximidade para pet:', petItem.title, petItem.id);

  try {
    const petLat = petItem.latitude ?? petItem.extra_fields?.location_details?.latitude;
    const petLng = petItem.longitude ?? petItem.extra_fields?.location_details?.longitude;
    const petCity = petItem.city || petItem.extra_fields?.location_details?.city || '';
    const petDistrict = petItem.neighborhood || petItem.extra_fields?.location_details?.district || '';
    const petTitle = petItem.title || 'Animal de Estimação';

    // 1. Busca todos os perfis de usuários cadastrados no sistema
    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, name, city, state, neighborhood, extra_fields, expo_push_token, whatsapp, phone')
      .neq('id', currentUserId || '00000000-0000-0000-0000-000000000000');

    if (profilesErr || !profiles || profiles.length === 0) {
      console.log('[broadcastLostPetAlert] Nenhum outro usuário encontrado para alertar.');
      return { notifiedCount: 0 };
    }

    const maxAlertRadiusKm = 15; // Raio máximo de alerta comunitário de 15 km
    const targetUsers = [];
    const pushTokensToNotify = [];

    for (const profile of profiles) {
      let isNearby = false;
      let calculatedDist = null;

      const profileLat = profile.extra_fields?.coords?.latitude || profile.extra_fields?.latitude;
      const profileLng = profile.extra_fields?.coords?.longitude || profile.extra_fields?.longitude;

      if (petLat != null && petLng != null && profileLat != null && profileLng != null) {
        calculatedDist = calculateDistanceKm(petLat, petLng, profileLat, profileLng);
        if (calculatedDist != null && calculatedDist <= maxAlertRadiusKm) {
          isNearby = true;
        }
      } else if (petCity && profile.city && petCity.trim().toLowerCase() === profile.city.trim().toLowerCase()) {
        // Fallback por cidade se o usuário não tiver coordenadas exatas
        isNearby = true;
      }

      if (isNearby) {
        targetUsers.push(profile);
        const token = profile.expo_push_token || profile.extra_fields?.expo_push_token;
        if (token) {
          pushTokensToNotify.push(token);
        }
      }
    }

    console.log(`[broadcastLostPetAlert] 📍 ${targetUsers.length} usuários situados na proximidade do epicentro.`);

    const alertTitle = '🚨 Alerta de Pet Perdido na sua Região!';
    const locationHint = petDistrict ? `no Bairro ${petDistrict}` : (petCity ? `em ${petCity}` : 'na sua proximidade');
    const alertMessage = `Um ${petTitle} foi dado como perdido ${locationHint}. Fique atento(a) e ajude a avisar caso o veja!`;

    // 2. Cria notificações in-app persistentes no Supabase para cada usuário próximo
    const inAppNotifications = targetUsers.map((target) => ({
      user_id: target.id,
      title: alertTitle,
      message: alertMessage,
      type: 'nearby_lost_pet',
      read: false,
      item_id: petItem.id,
      created_at: new Date().toISOString(),
    }));

    if (inAppNotifications.length > 0) {
      try {
        await supabase.from('notifications').insert(inAppNotifications);
      } catch (insertErr) {
        console.warn('[broadcastLostPetAlert] Aviso ao inserir notificações in-app:', insertErr.message);
      }
    }

    // 3. Dispara Push Notifications do Expo em lote
    if (pushTokensToNotify.length > 0) {
      await sendExpoPushNotification({
        to: pushTokensToNotify,
        title: alertTitle,
        body: alertMessage,
        data: {
          itemId: petItem.id,
          type: 'nearby_lost_pet',
          screen: 'ItemDetail',
        },
      });
    }

    // 4. Dispara alerta no WhatsApp para quem autorizou
    for (const target of targetUsers) {
      if (target.extra_fields?.whatsapp_notifications_enabled) {
        try {
          await dispatchSystemNotificationToWhatsApp({
            userId: target.id,
            title: alertTitle,
            message: alertMessage,
            type: 'nearby_lost_pet',
          });
        } catch (_) {}
      }
    }

    return { notifiedCount: targetUsers.length };
  } catch (error) {
    console.warn('[broadcastLostPetAlert] Erro ao disparar alerta comunitário:', error.message);
    return { notifiedCount: 0 };
  }
}
