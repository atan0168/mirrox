import { RPM_APPLICATION_ID, RPM_SUBDOMAIN } from '../constants';
import { UserProfile } from '../models/User';
import { localStorageService } from './LocalStorageService';

interface RPMUser {
  id: string;
  token: string;
}

interface RPMTemplate {
  id: string;
  imageUrl: string;
  modelUrl: string;
  gender: 'male' | 'female';
  outfit: string;
}

interface RPMAvatar {
  id: string;
  modelUrl: string;
  imageUrl: string;
}

interface RPMAsset {
  id: string;
  type: string;
  gender: 'male' | 'female';
  name: string;
  iconUrl: string;
}

interface SkinToneOption {
  id: string;
  name: string;
  iconUrl: string;
  value: number; // 1-5 scale for skin tone darkness
}

class ReadyPlayerMeApiService {
  private baseUrl = 'https://api.readyplayer.me';

  /**
   * Step 1: Create an anonymous user and get access token
   */
  async createAnonymousUser(): Promise<RPMUser> {
    try {
      const response = await fetch(`https://mirrox.readyplayer.me/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            applicationId: RPM_APPLICATION_ID,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create user: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Created anonymous user:', data);
      return {
        id: data.data.id,
        token: data.data.token,
      };
    } catch (error) {
      console.error('Error creating anonymous user:', error);
      throw error;
    }
  }

  /**
   * Step 2.1: Fetch all available templates
   */
  async getTemplates(token: string): Promise<RPMTemplate[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/avatars/templates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Fetched templates:', data);
      return data.data.map((template: any) => ({
        id: template.id,
        imageUrl: template.imageUrl,
        modelUrl: template.modelUrl,
        gender: template.gender,
        outfit: template.outfit,
      }));
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }

  /**
   * Step 2.2: Select a template based on gender
   */
  async selectTemplateByGender(
    token: string,
    gender: 'male' | 'female'
  ): Promise<RPMTemplate> {
    try {
      const templates = await this.getTemplates(token);

      // Filter templates by gender
      const genderTemplates = templates.filter(
        template => template.gender === gender
      );

      if (genderTemplates.length === 0) {
        throw new Error(`No templates found for gender: ${gender}`);
      }

      // For now, return the first template of the specified gender
      // You could add additional logic here to select based on other criteria
      const selectedTemplate = genderTemplates[0];
      console.log(`Selected template for ${gender}:`, selectedTemplate);

      return selectedTemplate;
    } catch (error) {
      console.error('Error selecting template by gender:', error);
      throw error;
    }
  }

  /**
   * Get available skin tone assets from Ready Player Me
   */
  async getSkinToneAssets(
    token: string,
    gender: 'male' | 'female'
  ): Promise<SkinToneOption[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/assets`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch assets: ${response.statusText}`);
      }

      const data = await response.json();

      // Filter for skin tone assets
      const skinToneAssets = data.data.filter(
        (asset: any) => asset.type === 'skin' && asset.gender === gender
      );

      return skinToneAssets.map((asset: any, index: number) => ({
        id: asset.id,
        name: asset.name,
        iconUrl: asset.iconUrl,
        value: index / (skinToneAssets.length - 1), // Normalize to 0-1 scale
      }));
    } catch (error) {
      console.error('Error fetching skin tone assets:', error);
      throw error;
    }
  }

  /**
   * Update avatar with skin tone
   */
  async updateAvatarSkinTone(
    token: string,
    avatarId: string,
    skinToneAssetId: string
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/avatars/${avatarId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            assets: {
              skin: skinToneAssetId,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to update avatar skin tone: ${response.statusText}`
        );
      }

      console.log('Avatar skin tone updated successfully');
    } catch (error) {
      console.error('Error updating avatar skin tone:', error);
      throw error;
    }
  }

  /**
   * Step 3: Create a draft avatar from a template
   */
  async createAvatarFromTemplate(
    token: string,
    templateId: string,
    bodyType: 'fullbody' | 'halfbody' = 'fullbody'
  ): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v2/avatars/templates/${templateId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              partner: RPM_SUBDOMAIN,
              bodyType: bodyType,
            },
          }),
        }
      );

      console.log('RPM_SUBDOMAIN', RPM_SUBDOMAIN);
      console.log('templateId', templateId);
      console.log('bodyType', bodyType);
      console.log(
        'Response',
        response.ok,
        response.statusText,
        response.status
      );

      if (!response.ok) {
        throw new Error(`Failed to create avatar: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data.id; // Returns avatar ID
    } catch (error) {
      console.error('Error creating avatar from template:', error);
      throw error;
    }
  }

  /**
   * Step 2.3: Get the draft avatar GLB URL
   */
  getDraftAvatarUrl(avatarId: string): string {
    return `${this.baseUrl}/v2/avatars/${avatarId}.glb?preview=true`;
  }

  /**
   * Step 2.4: Save the draft avatar permanently and cache it locally
   */
  async saveAvatar(token: string, avatarId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/avatars/${avatarId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to save avatar: ${response.statusText}`);
      }

      // After successful save, cache the avatar locally
      const avatarUrl = this.getSavedAvatarUrl(avatarId);
      console.log(
        `Avatar saved successfully. Caching GLB file from: ${avatarUrl}`
      );

      try {
        await localStorageService.downloadAndCacheAvatar(avatarUrl);
        console.log(`Avatar ${avatarId} cached successfully`);
      } catch (cacheError) {
        console.warn(`Failed to cache avatar ${avatarId}:`, cacheError);
        // Don't throw here - avatar creation was successful, caching is optional
      }
    } catch (error) {
      console.error('Error saving avatar:', error);
      throw error;
    }
  }

  /**
   * Get the final saved avatar URL
   */
  getSavedAvatarUrl(avatarId: string): string {
    return `https://models.readyplayer.me/${avatarId}.glb?morphTargets=ARKit,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown`;
  }

  /**
   * Complete avatar creation flow based on user profile
   */
  async createAvatarForUser(userProfile: UserProfile): Promise<string> {
    try {
      // Step 1: Create anonymous user
      const user = await this.createAnonymousUser();

      console.log('Created user', user);

      // Step 2: Select template based on user's gender
      const selectedTemplate = await this.selectTemplateByGender(
        user.token,
        userProfile.gender
      );

      // Step 3: Create avatar from template
      const avatarId = await this.createAvatarFromTemplate(
        user.token,
        selectedTemplate.id,
        'fullbody'
      );

      // Step 4: Optionally customize skin tone
      // Note: This requires additional API calls to get and apply skin tone assets
      // For now, we'll just log the user's preference
      console.log(`User selected skin tone: ${userProfile.skinTone}`);

      // TODO: Implement skin tone customization
      // const skinToneAssets = await this.getSkinToneAssets(user.token, userProfile.gender);
      // const selectedSkinTone = this.mapSkinToneToAsset(userProfile.skinTone, skinToneAssets);
      // if (selectedSkinTone) {
      //   await this.updateAvatarSkinTone(user.token, avatarId, selectedSkinTone.id);
      // }

      // Step 5: Save avatar
      await this.saveAvatar(user.token, avatarId);

      // Step 6: Return final avatar URL
      return this.getSavedAvatarUrl(avatarId);
    } catch (error) {
      console.error('Error in complete avatar creation flow:', error);
      throw error;
    }
  }

  /**
   * Map user's skin tone preference to available assets
   */
  private mapSkinToneToAsset(
    userSkinTone: 'light' | 'medium' | 'dark',
    availableAssets: SkinToneOption[]
  ): SkinToneOption | null {
    if (availableAssets.length === 0) return null;

    // Sort assets by skin tone value (0 = lightest, 1 = darkest)
    const sortedAssets = [...availableAssets].sort((a, b) => a.value - b.value);

    switch (userSkinTone) {
      case 'light':
        // Return the lightest skin tone (lowest value)
        return sortedAssets[0];
      case 'medium':
        // Return middle skin tone
        const middleIndex = Math.floor(sortedAssets.length / 2);
        return sortedAssets[middleIndex];
      case 'dark':
        // Return the darkest skin tone (highest value)
        return sortedAssets[sortedAssets.length - 1];
      default:
        return sortedAssets[0];
    }
  }

  /**
   * Get avatar customization options based on user profile
   * This can be used to further customize the avatar after creation
   */
  getCustomizationOptions(userProfile: UserProfile): any {
    const options: any = {};

    // Map user profile to avatar customization
    if (userProfile.sleepHours < 6) {
      options.eyes = 'tired';
    } else if (userProfile.sleepHours >= 8) {
      options.eyes = 'happy';
    }

    if (
      userProfile.commuteMode === 'bike' ||
      userProfile.commuteMode === 'walk'
    ) {
      options.body = 'athletic';
    }

    // Add more customization logic based on your needs
    return options;
  }
}

export const readyPlayerMeApiService = new ReadyPlayerMeApiService();
