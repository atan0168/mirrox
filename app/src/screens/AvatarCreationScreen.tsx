import { Bot, Palette, Zap } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Loader from '../components/ui/Loader';
import { localStorageService } from '../services/LocalStorageService';
import { readyPlayerMeApiService } from '../services/ReadyPlayerMeApiService';
import { borderRadius, colors, fontSize, shadows, spacing } from '../theme';
import { RPM_SUBDOMAIN } from '../constants';
import { useUserProfile } from '../hooks/useUserProfile';

// Replace 'demo' with your actual subdomain from Ready Player Me

interface AvatarCreationScreenProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
}

const AvatarCreationScreen: React.FC<AvatarCreationScreenProps> = ({
  navigation,
}) => {
  const { data: userProfile } = useUserProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [isFrameReady, setIsFrameReady] = useState(false);
  const [showCreationOptions, setShowCreationOptions] = useState(true);
  const [creationMethod, setCreationMethod] = useState<'api' | 'iframe' | null>(
    null
  );
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Check if avatar already exists and skip creation if it does
      const existingAvatarUrl = await localStorageService.getAvatarUrl();
      if (!mounted) return;
      if (existingAvatarUrl) {
        console.log('Avatar already exists, navigating to dashboard');
        navigation.navigate('Dashboard');
        return;
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigation]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleWebViewMessage = async (event: any) => {
    try {
      const json = JSON.parse(event.nativeEvent.data);
      console.log('Received message from ReadyPlayerMe:', json);

      // Check for avatar export event
      if (json.eventName === 'v1.avatar.exported') {
        const url = json.data.url;
        console.log('Avatar exported:', url);

        // Save the avatar URL
        await localStorageService.saveAvatarUrl(url);

        // Navigate to dashboard
        navigation.navigate('Dashboard');
      }

      // Check for frame ready event
      if (json.eventName === 'v1.frame.ready') {
        console.log('Frame ready');
        setIsFrameReady(true);
        setIsLoading(false);

        // Subscribe to all events
        webViewRef.current?.postMessage(
          JSON.stringify({
            target: 'readyplayerme',
            type: 'subscribe',
            eventName: 'v1.**',
          })
        );

        // TODO: Send custom configuration based on user profile
        if (userProfile) {
          // Example: Set gender or other preferences based on user data
          // This would require additional user profile fields
          console.log('User profile available for customization:', userProfile);
        }
      }

      // Handle user set event (when user clicks "Next" in the creator)
      if (json.eventName === 'v1.user.set') {
        console.log('User set event:', json.data);
      }

      // Handle avatar loading events
      if (json.eventName === 'v1.avatar.loading') {
        console.log('Avatar loading...');
      }
    } catch (e) {
      console.log('Error parsing message from ReadyPlayerMe iframe', e);
    }
  };

  const handleQuickCreate = async () => {
    if (!userProfile) {
      Alert.alert('Error', 'User profile not found');
      return;
    }

    setIsLoading(true);
    setCreationMethod('api');
    setShowCreationOptions(false);

    try {
      const avatarUrl =
        await readyPlayerMeApiService.createAvatarForUser(userProfile);

      // Save the avatar URL
      await localStorageService.saveAvatarUrl(avatarUrl);

      // Navigate to dashboard
      navigation.navigate('Dashboard');
    } catch (error) {
      console.error('Error creating avatar via API:', error);
      Alert.alert(
        'Error',
        'Failed to create avatar automatically. Please try the custom creation option.',
        [
          {
            text: 'Try Custom Creation',
            onPress: () => {
              setCreationMethod('iframe');
              setShowCreationOptions(false);
              setIsLoading(false);
            },
          },
          {
            text: 'Retry',
            onPress: () => {
              setIsLoading(false);
              setShowCreationOptions(true);
              setCreationMethod(null);
            },
          },
        ]
      );
    }
  };

  const handleCustomCreate = () => {
    setCreationMethod('iframe');
    setShowCreationOptions(false);
    setIsLoading(true);
  };

  const constructAvatarUrl = () => {
    let url = `https://${RPM_SUBDOMAIN}.readyplayer.me/avatar?frameApi`;

    // Add configuration parameters based on user profile or preferences
    const params = new URLSearchParams();

    // You can add custom parameters here based on your needs
    if (userProfile?.gender) {
      params.append('gender', userProfile.gender);
    }
    params.append('bodyType', 'fullbody');
    params.append('language', 'en');

    const queryString = params.toString();
    if (queryString) {
      url += `&${queryString}`;
    }

    return url;
  };

  if (showCreationOptions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Choose how you'd like to create your digital twin
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleQuickCreate}
          >
            <View style={styles.optionIcon}>
              <Zap size={32} color={colors.neutral[600]} />
            </View>
            <Text style={styles.optionTitle}>Quick Create</Text>
            <Text style={styles.optionDescription}>
              Let us create an avatar for you based on your profile answers.
              Fast and personalized!
            </Text>
            <View style={styles.optionButton}>
              <Text style={styles.optionButtonText}>Create Automatically</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleCustomCreate}
          >
            <View style={styles.optionIcon}>
              <Palette size={32} color={colors.neutral[600]} />
            </View>
            <Text style={styles.optionTitle}>Custom Create</Text>
            <Text style={styles.optionDescription}>
              Design your avatar from scratch with full customization options.
              Takes more time but fully personalized.
            </Text>
            <View style={styles.optionButton}>
              <Text style={styles.optionButtonText}>Customize Yourself</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {creationMethod === 'api'
            ? 'Creating Your Avatar'
            : 'Customize Your Avatar'}
        </Text>
        <Text style={styles.subtitle}>
          {creationMethod === 'api'
            ? 'Please wait while we generate your personalized avatar...'
            : 'Design your digital twin that will represent you in the app'}
        </Text>
      </View>

      {creationMethod === 'api' ? (
        <View style={styles.apiCreationContainer}>
          <Loader />
          <Text style={styles.loadingText}>Generating your avatar...</Text>
          <Text style={styles.loadingSubtext}>
            We're creating an avatar based on your profile preferences
          </Text>
        </View>
      ) : (
        <View style={styles.webviewContainer}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <Loader />
              <Text style={styles.loadingText}>Loading avatar creator...</Text>
            </View>
          )}

          <WebView
            ref={webViewRef}
            source={{ uri: constructAvatarUrl() }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={handleWebViewMessage}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => {
              // Keep loading state until frame is ready
              if (isFrameReady) {
                setIsLoading(false);
              }
            }}
            onError={syntheticEvent => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent.description);
              setIsLoading(false);
              Alert.alert(
                'Error',
                'Failed to load avatar creator. Please check your internet connection and try again.',
                [
                  {
                    text: 'Retry',
                    onPress: () => {
                      setIsLoading(true);
                      setIsFrameReady(false);
                      webViewRef.current?.reload();
                    },
                  },
                ]
              );
            }}
            onHttpError={syntheticEvent => {
              const { nativeEvent } = syntheticEvent;
              console.warn(
                'HTTP error response',
                nativeEvent.statusCode,
                nativeEvent.url
              );
            }}
            // Additional WebView props for better performance
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="compatibility"
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
          />
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          {creationMethod === 'api' && (
            <Bot size={16} color={colors.neutral[600]} />
          )}
          <Text style={styles.footerText}>
            {creationMethod === 'api'
              ? 'Creating your perfect avatar...'
              : 'Tip: Take your time to customize your avatar. It will represent you throughout the app!'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const ANDROID_STATUSBAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    paddingHorizontal: spacing.lg,
    // Add status bar height on Android to avoid content appearing too high / cramped
    paddingTop: spacing.lg - ANDROID_STATUSBAR_HEIGHT,
    paddingBottom: spacing.md, // give a little more breathing room before the cards
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
    color: colors.black,
  },
  subtitle: {
    fontSize: fontSize.base,
    textAlign: 'center',
    color: colors.neutral[600],
    lineHeight: 22,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.neutral[600],
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  optionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.soft,
  },
  optionIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    alignSelf: 'center',
  },
  optionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
    color: colors.black,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    color: colors.neutral[600],
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  optionButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  optionButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  apiCreationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingSubtext: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  footerText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    color: colors.neutral[500],
    lineHeight: 20,
  },
});

export default AvatarCreationScreen;
