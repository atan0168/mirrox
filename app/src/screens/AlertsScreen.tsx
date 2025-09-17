import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { colors, spacing, fontSize } from '../theme';
import { useAlerts } from '../hooks/useAlerts';
import { useDismissedAlertsToday } from '../hooks/useDismissedAlertsToday';
import { AlertsService } from '../services/AlertsService';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { X } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import type { AlertItem } from '../models/Alert';

const AlertDetails: React.FC<{
  item?: AlertItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  if (!item) return null;
  return (
    <>
      <TouchableOpacity
        style={styles.modalClose}
        onPress={onClose}
        accessibilityLabel="Close"
      >
        <X size={18} color={colors.neutral[800]} />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.modalContent}>
        <Text style={styles.modalTitle}>{item.title}</Text>
        <Text style={styles.modalBody}>{item.longBody}</Text>
        {item.sourceName && item.sourceUrl ? (
          <Text
            style={styles.link}
            onPress={async () => {
              try {
                const supported = await Linking.canOpenURL(item.sourceUrl!);
                if (supported) await Linking.openURL(item.sourceUrl!);
              } catch {}
            }}
            accessibilityRole="link"
          >
            {`${item.sourceName} — ${item.sourceUrl}`}
          </Text>
        ) : null}
        {item.dataNote ? (
          <Text style={styles.note}>{item.dataNote}</Text>
        ) : null}
        <Text style={styles.modalTime}>{relativeTime(item.createdAt)}</Text>
      </ScrollView>
    </>
  );
};

const AlertsScreen: React.FC = () => {
  const { alerts, refresh } = useAlerts();
  const { alerts: dismissedToday, refresh: refreshDismissed } = useDismissedAlertsToday();
  const [tab, setTab] = useState<'active' | 'dismissed'>('active');
  const route = useRoute<RouteProp<RootStackParamList, 'Alerts'>>();
  const targetId = route.params?.alertId;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const data = useMemo(() => (tab === 'active' ? alerts : dismissedToday), [alerts, dismissedToday, tab]);

  const onRefreshBoth = async () => {
    await Promise.all([refresh(), refreshDismissed()]);
  };

  if (!data.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No active alerts</Text>
        <Text style={styles.emptySubtitle}>
          You’re all caught up. Check back later.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'active' && styles.tabBtnActive]}
          onPress={() => setTab('active')}
          accessibilityRole="button"
        >
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'dismissed' && styles.tabBtnActive]}
          onPress={() => setTab('dismissed')}
          accessibilityRole="button"
        >
          <Text style={[styles.tabText, tab === 'dismissed' && styles.tabTextActive]}>Dismissed Today</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg }}
        data={data}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const highlight = item.id === targetId;
          return (
            <TouchableOpacity
              style={[
                styles.card,
                highlight ? styles.cardHighlight : undefined,
              ]}
              onPress={() => {
                setSelectedId(item.id);
                setModalVisible(true);
              }}
            >
              <TouchableOpacity
                style={styles.dismissBtn}
               onPress={async () => {
                 await AlertsService.dismiss(item.id);
                 await onRefreshBoth();
               }}
                accessibilityLabel="Dismiss"
              >
                <X size={16} color={colors.neutral[700]} />
              </TouchableOpacity>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.shortBody}</Text>
              <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
            </TouchableOpacity>
          );
        }}
      />
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <AlertDetails
              item={data.find(a => a.id === selectedId)}
              onClose={() => setModalVisible(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  empty: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    position: 'relative',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  tabBtnActive: {
    backgroundColor: colors.white,
    borderColor: colors.neutral[400],
  },
  tabText: {
    color: colors.neutral[700],
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.neutral[900],
  },
  cardHighlight: {
    borderColor: colors.black,
  },
  dismissBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: 6,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.neutral[800],
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  source: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginBottom: spacing.xs,
  },
  link: {
    fontSize: fontSize.xs,
    color: colors.neutral[900],
    textDecorationLine: 'underline',
    marginBottom: spacing.xs,
  },
  note: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginBottom: spacing.xs,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '80%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: spacing.lg,
  },
  modalClose: {
    alignSelf: 'flex-end',
    padding: spacing.md,
  },
  modalContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  modalBody: {
    fontSize: fontSize.sm,
    color: colors.neutral[800],
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  modalTime: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
    marginTop: spacing.sm,
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

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 30) return 'Just now';
  const txt = formatDistanceToNow(d, { addSuffix: true });
  return txt.replace('about ', '').replace('less than a minute', 'Just now');
}
