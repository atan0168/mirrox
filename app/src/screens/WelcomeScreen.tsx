import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card } from '../components/ui';
import { borderRadius, colors, fontSize, spacing } from '../theme';

interface WelcomeScreenProps {
  navigation: any; // You can type this more strictly with NavigationProp
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const handleGetStarted = () => {
    navigation.navigate('Permission');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Card style={styles.welcomeCard} shadow="lg">
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#6EE7B7', '#3B82F6']} // your gradient colors
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconWrapper}
              >
                <Image
                  source={require('../../assets/avatar2d.png')}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Welcome to Your Digital Twin</Text>
            <Text style={styles.subtitle}>
              Create a magical representation of yourself that promotes wellness
              and self-awareness
            </Text>
          </Card>

          <Button
            fullWidth
            variant="secondary"
            size="lg"
            onPress={handleGetStarted}
          >
            Get Started
          </Button>
        </View>

        <View style={styles.privacyContainer}>
          <Text style={styles.privacy}>
            No accounts. No cloud profiles. Ever.
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
            <Text style={styles.privacyLink}>Privacy Practices</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    gap: spacing.xl,
  },
  welcomeCard: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  iconWrapper: {
    width: 250,
    height: 250,
    borderRadius: borderRadius.full,
    // backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    transform: [{ translateX: 5 }],
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.black,
  },
  subtitle: {
    fontSize: fontSize.base,
    textAlign: 'center',
    color: colors.neutral[600],
    lineHeight: 24,
  },
  privacyContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  privacy: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    lineHeight: 20,
  },
  privacyLink: {
    fontSize: fontSize.sm,
    color: colors.neutral[400],
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
});

export default WelcomeScreen;
