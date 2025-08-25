import * as React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Heart, Bell, Search, User } from 'lucide-react-native';
import { Button, Card, Badge, Avatar, Input } from '../components/ui';
import { colors, spacing, fontSize, borderRadius } from '../theme';

export const UIShowcaseScreen: React.FC = () => {
  const [inputValue, setInputValue] = React.useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Monochrome UI Components</Text>
          <Text style={styles.subtitle}>Clean, elegant, and minimal design system</Text>
        </View>

        {/* Buttons Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Buttons</Text>
          <View style={styles.buttonRow}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </View>
          
          <View style={styles.buttonRow}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </View>
          
          <Button fullWidth style={styles.fullWidthButton}>
            Full Width Button
          </Button>
          
          <View style={styles.buttonRow}>
            <Button disabled>Disabled</Button>
            <Button>
              <View style={styles.buttonWithIcon}>
                <Heart size={16} color={colors.black} />
                <Text style={styles.buttonIconText}>With Icon</Text>
              </View>
            </Button>
          </View>
        </Card>

        {/* Cards Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Cards</Text>
          
          <Card variant="default" padding="md" style={styles.cardExample}>
            <Text style={styles.cardText}>Default Card</Text>
            <Text style={styles.cardSubtext}>
              This is a default card with soft shadows and rounded corners.
            </Text>
          </Card>
          
          <Card variant="elevated" padding="md" style={styles.cardExample}>
            <Text style={styles.cardText}>Elevated Card</Text>
            <Text style={styles.cardSubtext}>
              This card has more prominent shadows for emphasis.
            </Text>
          </Card>
          
          <Card variant="outline" padding="md" style={styles.cardExample}>
            <Text style={styles.cardText}>Outline Card</Text>
            <Text style={styles.cardSubtext}>
              A subtle outline-only card for minimal designs.
            </Text>
          </Card>
        </Card>

        {/* Badges Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          
          <View style={styles.badgeRow}>
            <Badge size="sm">Small</Badge>
            <Badge size="md">Medium</Badge>
            <Badge size="lg">Large</Badge>
          </View>
          
          <View style={styles.badgeRow}>
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
          </View>
        </Card>

        {/* Avatars Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Avatars</Text>
          
          <View style={styles.avatarRow}>
            <Avatar size={32} fallback="SM" />
            <Avatar size={40} fallback="MD" />
            <Avatar size={56} fallback="LG" />
            <Avatar size={72} fallback="XL" />
          </View>
        </Card>

        {/* Inputs Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Inputs</Text>
          
          <Input
            label="Email"
            placeholder="Enter your email"
            value={inputValue}
            onChangeText={setInputValue}
            leftElement={<User size={16} color={colors.neutral[400]} />}
            containerStyle={styles.inputExample}
          />
          
          <Input
            label="Search"
            placeholder="Search something..."
            leftElement={<Search size={16} color={colors.neutral[400]} />}
            rightElement={<Bell size={16} color={colors.neutral[400]} />}
            containerStyle={styles.inputExample}
          />
          
          <Input
            label="With Error"
            placeholder="This field has an error"
            error="This field is required"
            containerStyle={styles.inputExample}
          />
          
          <Input
            label="With Helper Text"
            placeholder="Normal input"
            helperText="This is some helpful information"
            containerStyle={styles.inputExample}
          />
        </Card>

        {/* Combined Example */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Component Combination</Text>
          
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <Avatar size={48} fallback="JD" />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>John Doe</Text>
                <Badge variant="secondary" size="sm">Premium</Badge>
              </View>
            </View>
            
            <Text style={styles.profileDescription}>
              A clean, monochrome design system that focuses on simplicity and elegance.
            </Text>
            
            <View style={styles.profileActions}>
              <Button variant="ghost" size="sm">
                <Heart size={16} color={colors.neutral[600]} />
              </Button>
              <Button variant="primary" size="sm">Follow</Button>
            </View>
          </View>
        </Card>
      </ScrollView>
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
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    color: colors.black,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.neutral[600],
    textAlign: 'center',
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  fullWidthButton: {
    marginBottom: spacing.md,
  },
  buttonWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  buttonIconText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.black,
  },
  cardExample: {
    marginBottom: spacing.md,
  },
  cardText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  cardSubtext: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  avatarRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  inputExample: {
    marginBottom: spacing.md,
  },
  profileCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  profileDescription: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  profileActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
});
