import { Modal, View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  Heart,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Activity,
  Lightbulb,
  Info,
} from 'lucide-react-native';
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  lineHeight,
} from '../../theme';
import { Card } from './Card';
import { Button } from './Button';

interface StressInfoModalProps {
  visible: boolean;
  onClose: () => void;
  stressLevel: 'none' | 'mild' | 'moderate' | 'high';
  congestionFactor: number;
}

export function StressInfoModal({
  visible,
  onClose,
  stressLevel,
  congestionFactor,
}: StressInfoModalProps) {
  const getStressInfo = () => {
    switch (stressLevel) {
      case 'mild':
        return {
          title: 'Mild Stress Detected',
          icon: Heart,
          description: 'Your avatar is experiencing light stress levels.',
          causes: [
            'Light traffic congestion in your area',
            'Minor air quality concerns',
            'Slightly elevated heart rate indicators',
          ],
          recommendations: [
            'Take a few deep breaths',
            'Consider a short walk if air quality permits',
            'Stay hydrated',
            'Monitor traffic conditions for better route planning',
          ],
          color: colors.neutral[600],
          backgroundColor: colors.neutral[100],
        };
      case 'moderate':
        return {
          title: 'Moderate Stress Detected',
          icon: AlertTriangle,
          description: 'Your avatar is showing noticeable stress responses.',
          causes: [
            `Traffic congestion factor: ${(congestionFactor * 100).toFixed(0)}%`,
            'Moderate air pollution levels',
            'Environmental stress indicators',
            'Potential commute delays',
          ],
          recommendations: [
            'Consider alternative routes or transportation',
            'Practice stress-reduction techniques',
            'Limit outdoor activities if air quality is poor',
            'Plan extra time for travel',
            'Stay informed about traffic conditions',
          ],
          color: colors.neutral[800],
          backgroundColor: colors.warning,
        };
      case 'high':
        return {
          title: 'High Stress Alert',
          icon: AlertCircle,
          description:
            'Your avatar is experiencing significant stress levels that may impact wellbeing.',
          causes: [
            `High traffic congestion: ${(congestionFactor * 100).toFixed(0)}%`,
            'Poor air quality conditions',
            'Severe environmental stressors',
            'Major transportation disruptions',
          ],
          recommendations: [
            'Avoid unnecessary travel if possible',
            'Work from home if available',
            'Use air purifiers indoors',
            'Practice meditation or relaxation techniques',
            'Stay indoors during peak pollution hours',
            'Consider rescheduling outdoor activities',
          ],
          color: colors.neutral[100],
          backgroundColor: colors.error,
        };
      default:
        return {
          title: 'No Stress Detected',
          icon: CheckCircle,
          description: 'Your avatar is in a calm, stress-free state.',
          causes: [
            'Good air quality',
            'Minimal traffic congestion',
            'Optimal environmental conditions',
          ],
          recommendations: [
            'Enjoy the good conditions!',
            'Great time for outdoor activities',
          ],
          color: colors.neutral[600],
          backgroundColor: colors.neutral[50],
        };
    }
  };

  const stressInfo = getStressInfo();

  const IconComponent = stressInfo.icon;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Card variant="elevated" padding="none" style={styles.modalContainer}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View
              style={[
                styles.header,
                { backgroundColor: stressInfo.backgroundColor },
              ]}
            >
              <IconComponent
                size={32}
                color={stressInfo.color}
                style={styles.headerIcon}
              />
              <Text style={[styles.headerTitle, { color: stressInfo.color }]}>
                {stressInfo.title}
              </Text>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.description}>{stressInfo.description}</Text>
            </View>

            {/* Causes */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Activity size={18} color={colors.neutral[600]} />
                <Text style={styles.sectionTitle}>Contributing Factors</Text>
              </View>
              {stressInfo.causes.map((cause, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <Text style={styles.listText}>{cause}</Text>
                </View>
              ))}
            </View>

            {/* Recommendations */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Lightbulb size={18} color={colors.neutral[600]} />
                <Text style={styles.sectionTitle}>Recommendations</Text>
              </View>
              {stressInfo.recommendations.map((recommendation, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <Text style={styles.listText}>{recommendation}</Text>
                </View>
              ))}
            </View>

            {/* Additional Info */}
            <View style={styles.section}>
              <View style={styles.infoContainer}>
                <Info size={16} color={colors.neutral[400]} />
                <Text style={styles.infoText}>
                  This stress indicator is based on real-time traffic and air
                  quality data in your area. Your digital twin responds to
                  environmental conditions to help you make informed decisions.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Close Button */}
          <View style={styles.buttonContainer}>
            <Button onPress={onClose} variant="secondary" fullWidth>
              Got it!
            </Button>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.darker,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    maxHeight: '80%',
    width: '100%',
    maxWidth: 400,
  },
  scrollView: {
    maxHeight: 500,
  },
  header: {
    padding: spacing.lg,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: lineHeight.tight * fontSize.xl,
  },
  section: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.neutral[700],
    textAlign: 'center',
    lineHeight: lineHeight.normal * fontSize.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[800],
    marginLeft: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[400],
    marginRight: spacing.md,
    marginTop: 6,
  },
  listText: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    flex: 1,
    lineHeight: lineHeight.normal * fontSize.sm,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
    fontStyle: 'italic',
    lineHeight: lineHeight.normal * fontSize.xs,
    marginLeft: spacing.sm,
    flex: 1,
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingTop: 0,
  },
});
