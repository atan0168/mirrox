import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { localStorageService } from "../services/LocalStorageService";
import { UserProfile } from "../models/User";
import { readyPlayerMeApiService } from "../services/ReadyPlayerMeApiService";

// Replace 'demo' with your actual subdomain from Ready Player Me
const RPM_SUBDOMAIN = "mirrox";

interface AvatarCreationScreenProps {
  navigation: any;
}

const AvatarCreationScreen: React.FC<AvatarCreationScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isFrameReady, setIsFrameReady] = useState(false);
  const [showCreationOptions, setShowCreationOptions] = useState(true);
  const [creationMethod, setCreationMethod] = useState<'api' | 'iframe' | null>(null);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // Check if avatar already exists and skip creation if it does
    const existingAvatarUrl = localStorageService.getAvatarUrl();
    if (existingAvatarUrl) {
      console.log("Avatar already exists, navigating to dashboard");
      navigation.navigate("Dashboard");
      return;
    }

    // Get user profile to potentially customize avatar based on user data
    const profile = localStorageService.getUserProfile();
    if (profile) {
      setUserProfile(profile);
    }
  }, [navigation]);

  const handleWebViewMessage = (event: any) => {
    try {
      const json = JSON.parse(event.nativeEvent.data);
      console.log("Received message from ReadyPlayerMe:", json);

      // Check for avatar export event
      if (json.eventName === "v1.avatar.exported") {
        const url = json.data.url;
        console.log("Avatar exported:", url);
        
        // Save the avatar URL
        localStorageService.saveAvatarUrl(url);
        
        // Navigate to dashboard
        navigation.navigate("Dashboard");
      }

      // Check for frame ready event
      if (json.eventName === "v1.frame.ready") {
        console.log("Frame ready");
        setIsFrameReady(true);
        setIsLoading(false);
        
        // Subscribe to all events
        webViewRef.current?.postMessage(
          JSON.stringify({
            target: "readyplayerme",
            type: "subscribe",
            eventName: "v1.**",
          }),
        );

        // Optional: You can send custom configuration based on user profile
        if (userProfile) {
          // Example: Set gender or other preferences based on user data
          // This would require additional user profile fields
          console.log("User profile available for customization:", userProfile);
        }
      }

      // Handle user set event (when user clicks "Next" in the creator)
      if (json.eventName === "v1.user.set") {
        console.log("User set event:", json.data);
      }

      // Handle avatar loading events
      if (json.eventName === "v1.avatar.loading") {
        console.log("Avatar loading...");
      }

    } catch (e) {
      console.log("Error parsing message from ReadyPlayerMe iframe", e);
    }
  };


  const handleQuickCreate = async () => {
    if (!userProfile) {
      Alert.alert("Error", "User profile not found");
      return;
    }

    setIsLoading(true);
    setCreationMethod('api');
    setShowCreationOptions(false);

    try {
      const avatarUrl = await readyPlayerMeApiService.createAvatarForUser(userProfile);
      
      // Save the avatar URL
      localStorageService.saveAvatarUrl(avatarUrl);
      
      // Navigate to dashboard
      navigation.navigate("Dashboard");
    } catch (error) {
      console.error('Error creating avatar via API:', error);
      Alert.alert(
        "Error", 
        "Failed to create avatar automatically. Please try the custom creation option.",
        [
          {
            text: "Try Custom Creation",
            onPress: () => {
              setCreationMethod('iframe');
              setShowCreationOptions(false);
              setIsLoading(false);
            }
          },
          {
            text: "Retry",
            onPress: () => {
              setIsLoading(false);
              setShowCreationOptions(true);
              setCreationMethod(null);
            }
          }
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
          <Text style={styles.title}>Create Your Avatar</Text>
          <Text style={styles.subtitle}>
            Choose how you'd like to create your digital twin
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.optionCard} onPress={handleQuickCreate}>
            <Text style={styles.optionIcon}>⚡</Text>
            <Text style={styles.optionTitle}>Quick Create</Text>
            <Text style={styles.optionDescription}>
              Let us create an avatar for you based on your profile answers. Fast and personalized!
            </Text>
            <View style={styles.optionButton}>
              <Text style={styles.optionButtonText}>Create Automatically</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handleCustomCreate}>
            <Text style={styles.optionIcon}>🎨</Text>
            <Text style={styles.optionTitle}>Custom Create</Text>
            <Text style={styles.optionDescription}>
              Design your avatar from scratch with full customization options. Takes more time but fully personalized.
            </Text>
            <View style={styles.optionButton}>
              <Text style={styles.optionButtonText}>Customize Yourself</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 Both options create a unique avatar that represents you in the app
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {creationMethod === 'api' ? 'Creating Your Avatar' : 'Customize Your Avatar'}
        </Text>
        <Text style={styles.subtitle}>
          {creationMethod === 'api' 
            ? 'Please wait while we generate your personalized avatar...'
            : 'Design your digital twin that will represent you in the app'
          }
        </Text>
      </View>

      {creationMethod === 'api' ? (
        <View style={styles.apiCreationContainer}>
          <ActivityIndicator size="large" color="#3182CE" />
          <Text style={styles.loadingText}>Generating your avatar...</Text>
          <Text style={styles.loadingSubtext}>
            We're creating an avatar based on your profile preferences
          </Text>
        </View>
      ) : (
        <View style={styles.webviewContainer}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#3182CE" />
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
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn("WebView error: ", nativeEvent.description);
              setIsLoading(false);
              Alert.alert(
                "Error",
                "Failed to load avatar creator. Please check your internet connection and try again.",
                [
                  {
                    text: "Retry",
                    onPress: () => {
                      setIsLoading(true);
                      setIsFrameReady(false);
                      webViewRef.current?.reload();
                    },
                  },
                ]
              );
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn(
                "HTTP error response",
                nativeEvent.statusCode,
                nativeEvent.url,
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
        <Text style={styles.footerText}>
          {creationMethod === 'api' 
            ? '🤖 AI is creating your perfect avatar...'
            : '💡 Tip: Take your time to customize your avatar. It will represent you throughout the app!'
          }
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#2D3748",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#4A5568",
    lineHeight: 22,
    marginBottom: 16,
  },
  webviewContainer: {
    flex: 1,
    position: "relative",
  },
  webview: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4A5568",
    textAlign: "center",
  },
  optionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  optionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionIcon: {
    fontSize: 32,
    textAlign: "center",
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#2D3748",
  },
  optionDescription: {
    fontSize: 14,
    textAlign: "center",
    color: "#4A5568",
    lineHeight: 20,
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: "#3182CE",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  optionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  apiCreationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  footerText: {
    fontSize: 14,
    textAlign: "center",
    color: "#718096",
    lineHeight: 20,
  },
});

export default AvatarCreationScreen;