import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Card } from "../components/ui";
import { borderRadius, colors, fontSize, spacing } from "../theme";

interface PrivacyScreenProps {
  navigation: any;
}

const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* <Card style={styles.contentCard} shadow="lg"> */}
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.effectiveDate}>Effective Date: 28 Aug 2025</Text>

        <Text style={styles.introText}>
          Mirrox ("we," "our," or "us") respects your privacy and is committed
          to protecting it. This Privacy Policy explains how we handle
          information when you use our mobile application (the "App"). By using
          the App, you agree to the practices described in this Privacy Policy.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.bodyText}>
            We do not collect or store any personal information on our servers.
            All data is stored locally on your device and is protected using
            industry-standard AES encryption.
          </Text>
          <Text style={styles.bodyText}>
            The App may access the following information only for the purposes
            described below:
          </Text>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Location Data:</Text> Your device
              location may be used to provide localized information such as
              weather conditions, air quality index, or similar features.
              Location data is processed locally on your device and is not
              stored or transmitted to our servers.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Food Diary Entries:</Text> If you
              use the food diary feature, the text you provide may be
              transmitted to trusted third-party large language model (LLM) APIs
              to generate dietary assessments and insights. These entries are
              not stored on our servers. Once the response is delivered to your
              device, no further copies are retained by us.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Information</Text>
          <Text style={styles.bodyText}>
            We use information solely to provide the core functionality of the
            App, including:
          </Text>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Displaying localized environmental information (weather, air
              quality, etc.)
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Providing personalized dietary assessments based on your food
              diary entries
            </Text>
          </View>
          <Text style={styles.bodyText}>
            We do not use your data for advertising, profiling, or analytics.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Data Storage and Security</Text>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              All user data is stored exclusively on your device.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Data is encrypted using AES encryption.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              When you delete the App, all data stored on your device will be
              permanently lost.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              We do not maintain backup copies of your data.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Third-Party Services</Text>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>
                Weather and Environmental Data:
              </Text>
              To provide weather and air quality information, the App may query
              third-party data providers using your location.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Food Diary Analysis:</Text> Your
              food diary entries may be processed by external LLM APIs to
              provide insights. These third-party providers may temporarily
              process the data but we do not authorize them to store or reuse
              it.
            </Text>
          </View>
          <Text style={styles.bodyText}>
            We encourage you to review the privacy policies of any third-party
            providers whose services are integrated into the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Children's Privacy</Text>
          <Text style={styles.bodyText}>
            The App is not directed to children under the age of 13. We do not
            knowingly collect personal information from children. If you believe
            we have inadvertently received information from a child under 13,
            please contact us so we can delete it.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Your Privacy Choices</Text>
          <Text style={styles.bodyText}>
            Because all data is stored on your device, you remain in full
            control:
          </Text>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              You may revoke location permissions at any time through your
              device settings.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              You may delete the App at any time, which will permanently erase
              all associated data.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            7. Changes to This Privacy Policy
          </Text>
          <Text style={styles.bodyText}>
            We may update this Privacy Policy from time to time to reflect
            changes in technology, law, or our services. The "Effective Date" at
            the top indicates when this Policy was last updated. We encourage
            you to review it periodically.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Contact Us</Text>
          <Text style={styles.bodyText}>
            If you have any questions about this Privacy Policy or our privacy
            practices, you may contact us at:
          </Text>
          <Text style={styles.contactInfo}>TM05 Mirrox</Text>
          <Text style={styles.contactInfo}>atan0168@student.monash.edu</Text>
        </View>
        {/* </Card> */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: fontSize.base,
    color: colors.neutral[600],
    fontWeight: "500",
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  contentCard: {
    marginBottom: spacing.xl,
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: "700",
    color: colors.black,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  effectiveDate: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    textAlign: "center",
    marginBottom: spacing.xl,
    fontStyle: "italic",
  },
  introText: {
    fontSize: fontSize.base,
    color: colors.neutral[700],
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: "600",
    color: colors.black,
    marginBottom: spacing.md,
  },
  bodyText: {
    fontSize: fontSize.base,
    color: colors.neutral[700],
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  bulletPoint: {
    fontSize: fontSize.base,
    color: colors.neutral[700],
    lineHeight: 24,
    marginBottom: spacing.sm,
    paddingLeft: spacing.md,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
    paddingLeft: 0,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: colors.neutral[700],
    marginTop: 8,
    marginRight: spacing.md,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.neutral[700],
    lineHeight: 24,
  },
  boldText: {
    fontWeight: "600",
    color: colors.neutral[800],
  },
  contactInfo: {
    fontSize: fontSize.base,
    color: colors.neutral[600],
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
});

export default PrivacyScreen;
