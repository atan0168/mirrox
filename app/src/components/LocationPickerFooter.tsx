import React, { useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { borderRadius, colors, fontSize, spacing } from '../theme';
import { Button } from './ui';
import { UserLocationDetails } from '../models/User';

type LocationPickerFooterProps = {
  allowCurrentLocation: boolean;
  geoLoading: boolean;
  selectedLocation: UserLocationDetails | null;
  statusMessage: string | null;
  onUseCurrentLocation: () => void;
  onConfirm: () => void;
};

export const LocationPickerFooter: React.FC<LocationPickerFooterProps> =
  React.memo(
    ({
      allowCurrentLocation,
      geoLoading,
      selectedLocation,
      statusMessage,
      onUseCurrentLocation,
      onConfirm,
    }) => {
      const selectedTitleRef = useRef<Text | null>(null);

      return (
        <View style={styles.sheetFooter}>
          <View style={styles.selectedCard}>
            <Text style={styles.selectedLabel}>Selected location</Text>
            {selectedLocation ? (
              <>
                <Text style={styles.selectedTitle} ref={selectedTitleRef}>
                  {selectedLocation.label}
                </Text>
                <Text style={styles.selectedSubtitle}>
                  {selectedLocation.coordinates.latitude.toFixed(4)},{' '}
                  {selectedLocation.coordinates.longitude.toFixed(4)}
                </Text>
              </>
            ) : (
              <Text style={styles.selectedPlaceholder}>
                Tap on the map or use search to choose a location.
              </Text>
            )}
            {statusMessage ? (
              <Text style={styles.statusText}>{statusMessage}</Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            {allowCurrentLocation ? (
              <Button
                variant="primary"
                onPress={onUseCurrentLocation}
                disabled={geoLoading}
                fullWidth
              >
                Use Current Location
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onPress={onConfirm}
              disabled={!selectedLocation || geoLoading}
              fullWidth
            >
              Confirm
            </Button>
          </View>
          {geoLoading ? (
            <View style={styles.geoLoadingOverlay}>
              <ActivityIndicator size="small" color={colors.neutral[500]} />
              <Text style={styles.geoLoadingText}>Updating location…</Text>
            </View>
          ) : null}
        </View>
      );
    }
  );

LocationPickerFooter.displayName = 'LocationPickerFooter';

const styles = StyleSheet.create({
  sheetFooter: {
    gap: spacing.lg,
  },
  selectedCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: spacing.md,
    backgroundColor: colors.neutral[50],
    gap: spacing.xs,
  },
  selectedLabel: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
  },
  selectedSubtitle: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  selectedPlaceholder: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
  },
  statusText: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
  },
  actions: {
    gap: spacing.md,
  },
  geoLoadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  geoLoadingText: {
    color: colors.neutral[600],
    fontSize: fontSize.sm,
  },
});
