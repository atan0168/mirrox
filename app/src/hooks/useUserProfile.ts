import { useQuery } from '@tanstack/react-query';
import { localStorageService } from '../services/LocalStorageService';
import { UserProfile } from '../models/User';

export const useUserProfile = () => {
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: async (): Promise<UserProfile> => {
      const profile = await localStorageService.getUserProfile();
      if (!profile) {
        throw new Error('User profile not found');
      }
      return profile;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - profile doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1, // Only retry once for profile fetching
    retryDelay: 1000, // 1 second delay before retry
  });
};