// swiftpay/src/services/pushNotificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from './api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  notificationListener = null;
  responseListener = null;

  /**
   * Initialiser les notifications push
   */
  async initializePushNotifications(onNotificationReceived) {
    try {
      // Vérifier si c'est un device physique
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return null;
      }

      // Demander les permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token permission');
        return null;
      }

      // Obtenir le token FCM
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.manifest?.extra?.eas?.projectId ||
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

      if (!projectId) {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        return token;
      }

      const token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

      // Sauvegarder le token au backend
      await this.registerTokenOnBackend(token);

      // Setup notification listeners
      this.notificationListener = Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log('Notification received:', notification);
          if (onNotificationReceived) {
            onNotificationReceived(notification);
          }
        }
      );

      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          console.log('Notification response:', response);
          // Gérer la navigation basée sur la notification
          this.handleNotificationResponse(response);
        }
      );

      return token;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return null;
    }
  }

  /**
   * Enregistrer le token au backend
   */
  async registerTokenOnBackend(token, deviceInfo = '') {
    try {
      await api.post('/notifications/register-token', {
        token,
        deviceInfo: deviceInfo || Device.modelName || 'Unknown',
      });
      console.log('FCM token registered successfully');
    } catch (error) {
      console.error('Error registering token:', error);
    }
  }

  /**
   * Gérer la réponse à une notification
   */
  handleNotificationResponse(response) {
    const data = response.notification.request.content.data;

    // Implémenter la navigation basée sur le type de notification
    if (data.type === 'transaction') {
      // Naviguer vers les transactions
      // Navigation.navigate('Transactions', { transactionId: data.transactionId });
    } else if (data.type === 'auth') {
      // Afficher une alerte de sécurité
      console.warn('Security alert:', data);
    }
  }

  /**
   * Envoyer une notification locale de test
   */
  async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          badge: 1,
        },
        trigger: { seconds: 2 },
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  /**
   * Obtenir les notifications de l'utilisateur
   */
  async getNotifications(limit = 50) {
    try {
      const response = await api.get('/notifications', {
        params: { limit },
      });
      return response.data.notifications || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId) {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false };
    }
  }

  /**
   * Retirer un token
   */
  async removeToken(token) {
    try {
      await api.delete(`/notifications/token/${token}`);
      console.log('Token removed successfully');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  /**
   * Nettoyer les listeners (au logout/unmount)
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export default new PushNotificationService();
