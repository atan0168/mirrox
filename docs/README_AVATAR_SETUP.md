# Ready Player Me Avatar Setup

## Configuration Required

To use the API-based avatar creation, you need to configure your Ready Player Me application:

### 1. Get Your Application ID

1. Go to [Ready Player Me Studio](https://studio.readyplayer.me/)
2. Create a new application or select an existing one
3. Navigate to your application settings
4. Copy the **Application ID**

### 2. Update the Configuration

Open `src/services/ReadyPlayerMeApiService.ts` and replace:

```typescript
const RPM_APPLICATION_ID = 'your-application-id';
```

With your actual Application ID:

```typescript
const RPM_APPLICATION_ID = 'your-actual-app-id-here';
```

### 3. Verify Your Subdomain

Make sure the subdomain in both files matches your Ready Player Me subdomain:

- `src/services/ReadyPlayerMeApiService.ts`
- `src/screens/GeneratingTwinScreen.tsx`

```typescript
const RPM_SUBDOMAIN = 'mirrox'; // Replace with your subdomain
```

## Features Implemented

### Automatic Avatar Creation

The app now automatically creates avatars during the onboarding flow:

1. **Profile-Based Creation**
   - Automatically creates an avatar based on user profile data
   - Uses Ready Player Me API with templates matching user preferences
   - Integrated into the `GeneratingTwinScreen` for seamless experience
   - Includes error handling with retry options

### Avatar Display

- **3D Avatar Rendering**: Uses Google's model-viewer for proper 3D display
- **Rectangular Container**: 280x350 pixels to show full avatar without cutoff
- **Interactive**: Users can rotate and view avatar from different angles
- **Auto-rotation**: Slowly rotates when not being interacted with

### User Flow

1. Welcome → Questionnaire → **GeneratingTwin (with automatic avatar creation)** → Dashboard
2. Avatar creation is automatic based on user profile
3. No manual avatar customization step (streamlined experience)
4. 3D avatar display in dashboard

## API Integration

The implementation includes:

- Anonymous user creation
- Template fetching and selection
- Avatar creation from templates
- Avatar saving and URL generation
- Error handling with fallback options

## Customization

You can customize avatar selection logic in `ReadyPlayerMeApiService.ts`:

```typescript
private selectTemplateForUser(templates: RPMTemplate[], userProfile: UserProfile): RPMTemplate {
  // Add your logic here based on:
  // - userProfile.gender
  // - userProfile.sleepHours
  // - userProfile.commuteMode
  // - userProfile.preferredStyle
  // etc.
}
```

## Testing

1. Make sure you have a valid Application ID configured
2. Test both Quick Create and Custom Create options
3. Verify 3D avatar display in dashboard
4. Test error handling (try with invalid Application ID)

## Troubleshooting

- **API Errors**: Check your Application ID and network connection
- **3D Display Issues**: Ensure model-viewer is loading properly
- **WebView Problems**: Check device WebView version and permissions
