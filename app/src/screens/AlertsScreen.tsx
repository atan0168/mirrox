import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
} from 'react-native';
import { AlertOctagon, AlertTriangle, Info, X } from 'lucide-react-native';
import { useHealthMetrics } from '../hooks/useHealthMetrics';
import { HealthAlert } from '../models/HealthAlert';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const AlertItem = ({
  alert,
  onDismiss,
}: {
  alert: HealthAlert;
  onDismiss: (id: string) => void;
}) => {
  const Icon = useMemo(() => {
    switch (alert.type) {
      case 'critical':
        return <AlertOctagon size={18} color={colors.red[600]} />;
      case 'warning':
        return <AlertTriangle size={18} color={colors.yellow[600]} />;
      default:
        return <Info size={18} color={colors.neutral[500]} />;
    }
  }, [alert.type]);

  const timeAgo = useMemo(() => {
    const t =
      alert.timestamp instanceof Date
        ? alert.timestamp.getTime()
        : new Date(alert.timestamp as any).getTime();
    const delta = Math.max(0, Date.now() - t);
    const mins = Math.floor(delta / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }, [alert.timestamp]);

  return (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIcon}>{Icon}</View>
        <Text style={styles.itemMessage}>{alert.message}</Text>
        <Pressable
          onPress={() => onDismiss(alert.id)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.dismissBtn,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityLabel="Dismiss alert"
        >
          <X size={16} color={colors.neutral[500]} />
        </Pressable>
      </View>
      {alert.recommendation ? (
        <Text style={styles.itemRecommendation}>{alert.recommendation}</Text>
      ) : null}
      <Text style={styles.itemMeta}>{timeAgo}</Text>
    </View>
  );
};

const AlertsScreen: React.FC = () => {
  const { alerts, dismissAlert, refetch, loading } = useHealthMetrics();

  const onDismiss = (id: string) => dismissAlert(id);

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No active alerts</Text>
      <Text style={styles.emptySubtitle}>
        You’re all caught up. Check back later.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={alerts}
        keyExtractor={(item: HealthAlert) => item.id}
        contentContainerStyle={
          alerts.length === 0 ? styles.listEmpty : styles.list
        }
        renderItem={({ item }: { item: HealthAlert }) => (
          <AlertItem alert={item} onDismiss={onDismiss} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  list: {
    padding: spacing.lg,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  item: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  separator: {
    height: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: spacing.sm,
  },
  itemMessage: {
    flex: 1,
    color: colors.neutral[900],
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  itemRecommendation: {
    marginTop: spacing.xs,
    color: colors.neutral[700],
    fontSize: fontSize.sm,
  },
  itemMeta: {
    marginTop: spacing.xs,
    color: colors.neutral[500],
    fontSize: fontSize.xs,
  },
  dismissBtn: {
    marginLeft: spacing.sm,
    padding: 4,
    borderRadius: 12,
  },
  empty: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
});

export default AlertsScreen;
