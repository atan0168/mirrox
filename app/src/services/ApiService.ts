import axios from 'axios';
import { AirQualityData } from '../models/AirQuality';

// Store base URL in a config file
const API_BASE_URL = 'https://your-backend-proxy.com'; // Replace with your actual backend URL

class ApiService {
  public async fetchAirQuality(latitude: number, longitude: number): Promise<AirQualityData> {
    try {
      const response = await axios.get<AirQualityData>(`${API_BASE_URL}/api/air-quality`, {
        params: {
          lat: latitude,
          lon: longitude,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch air quality:", error);
      // Re-throw a custom error to be handled by the UI
      throw new Error("Unable to connect to environmental services.");
    }
  }
}

export const apiService = new ApiService();
