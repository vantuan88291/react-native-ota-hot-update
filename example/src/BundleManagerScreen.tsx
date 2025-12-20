import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import hotUpdate from 'react-native-ota-hot-update';
import type { BundleInfo } from 'react-native-ota-hot-update';

interface BundleManagerScreenProps {
  onBack?: () => void;
}

export default function BundleManagerScreen({ onBack }: BundleManagerScreenProps) {
  const [bundles, setBundles] = useState<BundleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const loadBundles = async () => {
    try {
      const bundleList = await hotUpdate.getBundleList();
      setBundles(bundleList);
    } catch (error) {
      console.error('Error loading bundles:', error);
      Alert.alert('Error', 'Failed to load bundles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBundles();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBundles();
  };

  const handleDelete = (bundle: BundleInfo) => {
    Alert.alert(
      'Delete Bundle',
      `Are you sure you want to delete bundle version ${bundle.version}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(bundle.id);
              const success = await hotUpdate.deleteBundleById(bundle.id);
              if (success) {
                if (bundle.isActive) {
                  setTimeout(() => {
                    hotUpdate.resetApp();
                  }, 300);
                }
                await loadBundles();
                Alert.alert('Success', 'Bundle deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete bundle');
              }
            } catch (error) {
              console.error('Error deleting bundle:', error);
              Alert.alert('Error', 'Failed to delete bundle');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleActivate = (bundle: BundleInfo) => {
    if (bundle.isActive) {
      Alert.alert('Info', 'This bundle is already active');
      return;
    }

    Alert.alert(
      'Activate Bundle',
      `Do you want to activate bundle version ${bundle.version}? The app will restart.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            try {
              setActivatingId(bundle.id);
              const success = await hotUpdate.setupExactBundlePath(bundle.path);
              if (success) {
                setTimeout(() => {
                  hotUpdate.resetApp();
                }, 300);
              } else {
                Alert.alert('Error', 'Failed to activate bundle');
                setActivatingId(null);
              }
            } catch (error) {
              console.error('Error activating bundle:', error);
              Alert.alert('Error', 'Failed to activate bundle');
              setActivatingId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date | number) => {
    let d: Date;
    if (typeof date === 'number') {
      // If it's a timestamp in milliseconds
      d = new Date(date);
    } else if (date instanceof Date) {
      d = date;
    } else {
      // Fallback
      d = new Date();
    }
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderBundleItem = ({ item }: { item: BundleInfo }) => {
    const isDeleting = deletingId === item.id;
    const isActivating = activatingId === item.id;

    return (
      <View style={[styles.bundleCard, item.isActive && styles.activeCard]}>
        <View style={styles.bundleHeader}>
          <View style={styles.bundleInfo}>
            <View style={styles.versionContainer}>
              <Text style={styles.versionLabel}>Version</Text>
              <Text style={[styles.versionText, item.isActive && styles.activeVersionText]}>
                {item.version}
              </Text>
            </View>
            {item.isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <Text style={styles.bundleId}>{item.id}</Text>
        </View>

        <View style={styles.bundleDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{formatDate(item.date)}</Text>
          </View>
          {item.metadata && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Metadata:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {JSON.stringify(item.metadata)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.activateButton,
              isActivating && styles.loadingButton,
            ]}
            onPress={() => handleActivate(item)}
          >
            {isActivating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {item.isActive ? 'Active' : 'Activate'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.deleteButton,
              isDeleting && styles.loadingButton,
            ]}
            onPress={() => handleDelete(item)}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Delete</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading bundles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerTitle}>Bundle Manager</Text>
        <Text style={styles.headerSubtitle}>
          {bundles.length} bundle{bundles.length !== 1 ? 's' : ''} available
        </Text>
      </View>

      {bundles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No bundles found</Text>
          <Text style={styles.emptySubtext}>
            Download a bundle to see it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={bundles}
          renderItem={renderBundleItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  bundleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeCard: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  bundleHeader: {
    marginBottom: 12,
  },
  bundleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  versionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  activeVersionText: {
    color: '#007AFF',
  },
  activeBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bundleId: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
  },
  bundleDetails: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    width: 80,
  },
  detailValue: {
    fontSize: 13,
    color: '#1A1A1A',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  activateButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  loadingButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

