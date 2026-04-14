// swiftpay/src/screens/NotificationsScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LoadingSpinner } from '../components/Loading';
import { EmptyState } from '../components/Empty';
import pushNotificationService from '../services/pushNotificationService';

const NotificationsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const notifs = await pushNotificationService.getNotifications(50);
      setNotifications(notifs);
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await pushNotificationService.markAsRead(notificationId);
      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'transaction':
        return '💳';
      case 'auth':
        return '🔒';
      case 'security':
        return '⚠️';
      default:
        return '📢';
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleMarkAsRead(item.id)}
      activeOpacity={0.7}
    >
      <Card
        style={[
          !item.read && {
            backgroundColor: colors.primaryLight,
          },
        ]}
      >
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationIcon}>
            {getNotificationIcon(item.type)}
          </Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.notificationTitle, { color: colors.textPrimary }]}>
              {item.title}
            </Text>
            <Text
              style={[styles.notificationBody, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {item.body}
            </Text>
          </View>
          {!item.read && (
            <View
              style={[
                styles.unreadIndicator,
                { backgroundColor: colors.primary },
              ]}
            />
          )}
        </View>
        <Text style={[styles.notificationTime, { color: colors.textTertiary }]}>
          {formatTime(item.created_at)}
        </Text>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingSpinner message="Loading notifications..." />;
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger, marginVertical: 16 }}>{error}</Text>
        <Button title="Retry" onPress={fetchNotifications} />
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="🔔"
          title="No notifications"
          message="You're all caught up!"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Notifications
        </Text>
        <Text style={[styles.notificationCount, { color: colors.textSecondary }]}>
          {notifications.filter((n) => !n.read).length} new
        </Text>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        scrollEnabled
      />
    </View>
  );
};

const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  
  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  notificationCount: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 32,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationBody: {
    fontSize: 12,
    marginTop: 4,
  },
  notificationTime: {
    fontSize: 10,
    marginLeft: 28,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});

export default NotificationsScreen;
