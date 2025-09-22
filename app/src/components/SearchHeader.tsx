import { X } from 'lucide-react-native';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { colors, spacing, fontSize } from '../theme';
import { Input } from './ui';

type SearchHeaderProps = {
  searchTerm: string;
  isSearchExpanded: boolean;
  onChangeSearchTerm: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onClear: () => void;
  onCollapse: () => void;
  searchLoading: boolean;
  searchError: string | null;
};

export const SearchHeader: React.FC<SearchHeaderProps> = React.memo(
  ({
    searchTerm,
    isSearchExpanded,
    onChangeSearchTerm,
    onFocus,
    onBlur,
    onClear,
    onCollapse,
    searchLoading,
    searchError,
  }) => (
    <View style={styles.sheetHeader}>
      <View style={styles.searchHeaderRow}>
        <Text style={styles.searchHeaderTitle}>Search</Text>
        {isSearchExpanded ? (
          <TouchableOpacity
            onPress={onCollapse}
            style={styles.sheetCloseButton}
            accessibilityRole="button"
            accessibilityLabel="Collapse search"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={24} color={colors.black} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.searchHeaderRow}>
        <Input
          placeholder="Search for a location"
          value={searchTerm}
          onChangeText={onChangeSearchTerm}
          autoCorrect={false}
          autoCapitalize="none"
          containerStyle={StyleSheet.flatten([
            styles.searchInput,
            styles.searchInputContainer,
          ])}
          onFocus={onFocus}
          onBlur={onBlur}
          rightElement={
            searchTerm.length > 0 ? (
              <TouchableOpacity
                onPress={onClear}
                style={styles.clearIconButton}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color={colors.neutral[400]} />
              </TouchableOpacity>
            ) : null
          }
        />
      </View>
      {searchLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.neutral[600]} />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      ) : null}
      {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}
    </View>
  )
);

SearchHeader.displayName = 'SearchHeader';

const styles = StyleSheet.create({
  sheetHeader: {
    gap: spacing.md,
  },
  searchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
  },
  sheetHeaderContainer: {
    marginBottom: spacing.md,
  },
  sheetFooter: {
    gap: spacing.lg,
  },
  searchInput: {
    marginBottom: spacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.neutral[600],
    fontSize: fontSize.sm,
  },
  clearIconButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xs,
  },
  searchHeaderTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
  },
  sheetCloseButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.red[600],
    fontSize: fontSize.sm,
  },
});
