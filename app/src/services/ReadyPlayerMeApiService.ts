import { UserProfile } from "../models/User";
import { localStorageService } from "./LocalStorageService";

// You'll need to get this from your Ready Player Me developer account
// To get your Application ID:
// 1. Go to https://studio.readyplayer.me/
// 2. Create or select your application
// 3. Copy the Application ID from the settings
const RPM_APPLICATION_ID = "68ab0e092240338178fb429e";
const RPM_SUBDOMAIN = "mirrox"; // Your subdomain

interface RPMUser {
  id: string;
  token: string;
}

interface RPMTemplate {
  id: string;
  imageUrl: string;
  modelUrl: string;
  gender: "male" | "female";
  outfit: string;
}

interface RPMAvatar {
  id: string;
  modelUrl: string;
  imageUrl: string;
}

class ReadyPlayerMeApiService {
  private baseUrl = "https://api.readyplayer.me";

  /**
   * Step 1: Create an anonymous user and get access token
   */
  async createAnonymousUser(): Promise<RPMUser> {
    try {
      const response = await fetch(`https://mirrox.readyplayer.me/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      console.log("Created anonymous user:", data);
      return {
        id: data.data.id,
        token: data.data.token,
      };
    } catch (error) {
      console.error("Error creating anonymous user:", error);
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
      console.log("Fetched templates:", data);
      return data.data.map((template: any) => ({
        id: template.id,
        imageUrl: template.imageUrl,
        modelUrl: template.modelUrl,
        gender: template.gender,
        outfit: template.outfit,
      }));
    } catch (error) {
      console.error("Error fetching templates:", error);
      throw error;
    }
  }

  /**
   * Step 2.2: Create a draft avatar from a template
   */
  async createAvatarFromTemplate(
    token: string,
    templateId: string,
    bodyType: "fullbody" | "halfbody" = "fullbody",
  ): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v2/avatars/templates/${templateId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: {
              partner: RPM_SUBDOMAIN,
              bodyType: bodyType,
            },
          }),
        },
      );

      console.log("RPM_SUBDOMAIN", RPM_SUBDOMAIN);
      console.log("templateId", templateId);
      console.log("bodyType", bodyType);
      console.log(
        "Response",
        response.ok,
        response.statusText,
        response.status,
      );

      if (!response.ok) {
        throw new Error(`Failed to create avatar: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data.id; // Returns avatar ID
    } catch (error) {
      console.error("Error creating avatar from template:", error);
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
        method: "PUT",
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
        `Avatar saved successfully. Caching GLB file from: ${avatarUrl}`,
      );

      try {
        await localStorageService.downloadAndCacheAvatar(avatarUrl);
        console.log(`Avatar ${avatarId} cached successfully`);
      } catch (cacheError) {
        console.warn(`Failed to cache avatar ${avatarId}:`, cacheError);
        // Don't throw here - avatar creation was successful, caching is optional
      }
    } catch (error) {
      console.error("Error saving avatar:", error);
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

      console.log("Created user", user);
      // Step 2: Get templates
      const templates = await this.getTemplates(user.token);

      // Step 3: Select template based on user profile
      const selectedTemplate = this.selectTemplateForUser(
        templates,
        userProfile,
      );

      // Step 4: Create avatar from template
      const avatarId = await this.createAvatarFromTemplate(
        user.token,
        selectedTemplate.id,
        "fullbody",
      );

      // Step 5: Save avatar
      await this.saveAvatar(user.token, avatarId);

      // Step 6: Return final avatar URL
      return this.getSavedAvatarUrl(avatarId);
    } catch (error) {
      console.error("Error in complete avatar creation flow:", error);
      throw error;
    }
  }

  /**
   * Select appropriate template based on user profile
   * You can customize this logic based on user answers
   */
  private selectTemplateForUser(
    templates: RPMTemplate[],
    userProfile: UserProfile,
  ): RPMTemplate {
    // For now, we'll select randomly, but you can add logic based on:
    // - userProfile.gender (if you add this field)
    // - userProfile.preferredStyle
    // - userProfile.ageRange
    // - etc.

    // Filter templates if you have gender preference
    let filteredTemplates = templates;

    if (userProfile.gender) {
      filteredTemplates = templates.filter(
        (t) => t.gender === userProfile.gender,
      );
    }

    // If no templates match criteria, use all templates
    if (filteredTemplates.length === 0) {
      filteredTemplates = templates;
    }

    // Select random template for now
    const randomIndex = Math.floor(Math.random() * filteredTemplates.length);
    return filteredTemplates[randomIndex];
  }

  /**
   * Get avatar customization options based on user profile
   * This can be used to further customize the avatar after creation
   */
  getCustomizationOptions(userProfile: UserProfile): any {
    const options: any = {};

    // Map user profile to avatar customization
    if (userProfile.sleepHours < 6) {
      options.eyes = "tired";
    } else if (userProfile.sleepHours >= 8) {
      options.eyes = "happy";
    }

    if (
      userProfile.commuteMode === "bike" ||
      userProfile.commuteMode === "walk"
    ) {
      options.body = "athletic";
    }

    // Add more customization logic based on your needs
    return options;
  }
}

export const readyPlayerMeApiService = new ReadyPlayerMeApiService();
