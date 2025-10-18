import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, fontSize, spacing } from '../../theme';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { RecommendationList } from './RecommendationList';
import { NutritionRecommendationsResult } from '../../types/nutrition';
import { FC } from 'react';

interface NutritionDetailsModalProps {
  showNutritionDetails: boolean;
  setShowNutritionDetails: (show: boolean) => void;
  nutritionRecommendations: NutritionRecommendationsResult;
  selectedNutritionAspectId: string | null;
}

export const NutritionDetailsModal: FC<NutritionDetailsModalProps> = ({
  showNutritionDetails,
  setShowNutritionDetails,
  nutritionRecommendations,
  selectedNutritionAspectId,
}) => (
  <Modal
    visible={showNutritionDetails}
    animationType="slide"
    presentationStyle="formSheet"
    onRequestClose={() => setShowNutritionDetails(false)}
  >
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Dietary Recommendations</Text>
        <TouchableOpacity
          onPress={() => setShowNutritionDetails(false)}
          style={styles.closeButton}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.modalContent}>
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Detailed Recommendations</Text>
          <Card>
            <View style={{ padding: spacing.md }}>
              <Text style={styles.recommendationMessage}>
                Suggestions and rationale based on today's logged intake.
              </Text>
              <RecommendationList
                nutritionRecommendations={nutritionRecommendations}
                selectedNutritionAspectId={selectedNutritionAspectId}
              />
              <Text style={[styles.timestamp, { marginTop: spacing.sm }]}>
                Sources: WHO, USDA MyPlate, Australian Dietary Guidelines, NHS.
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
      <View style={styles.modalFooter}>
        <Button
          variant="secondary"
          onPress={() => setShowNutritionDetails(false)}
          fullWidth
        >
          Close
        </Button>
      </View>
    </SafeAreaView>
  </Modal>
);

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: fontSize.lg,
    color: colors.neutral[600],
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalFooter: {
    padding: spacing.lg,
    backgroundColor: colors.neutral[50],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  metricsSection: {
    marginBottom: spacing.lg * 2,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  recommendationMessage: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.sm,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
  },
});
