import React from 'react';
import { View } from 'react-native';
import HealthSummary from './HealthSummary';
import { EnvironmentalInfoSquares } from './EnvironmentalInfoSquares';

// Example of how to use the updated components with error handling

const ErrorHandlingExample: React.FC = () => {
  // Example error state for HealthSummary
  const healthSummaryWithError = (
    <HealthSummary
      isError={true}
      errorMessage="Failed to fetch health data from server"
    />
  );

  // Example error state for EnvironmentalInfoSquares
  const environmentalInfoWithErrors = (
    <EnvironmentalInfoSquares
      isAirQualityError={true}
      isTrafficError={true}
      airQualityErrorMessage="Air quality service is temporarily unavailable"
      trafficErrorMessage="Traffic data service is down"
    />
  );

  // Example with partial errors (only air quality fails)
  const environmentalInfoPartialError = (
    <EnvironmentalInfoSquares
      isAirQualityError={true}
      isTrafficError={false}
      airQualityErrorMessage="Unable to connect to air quality service"
      trafficData={{
        stressLevel: 'mild',
        congestionFactor: 1.2,
        currentSpeed: 45,
        freeFlowSpeed: 60,
        currentTravelTime: 1800,
        freeFlowTravelTime: 1500,
        confidence: 0.85,
      }}
    />
  );

  // Example with normal loading states
  const environmentalInfoLoading = (
    <EnvironmentalInfoSquares
      isAirQualityLoading={true}
      isTrafficLoading={true}
    />
  );

  return (
    <View>
      {/* These components now gracefully handle error states */}
      {healthSummaryWithError}
      {environmentalInfoWithErrors}
      {environmentalInfoPartialError}
      {environmentalInfoLoading}
    </View>
  );
};

export default ErrorHandlingExample;

/*
Usage in your main components:

1. For HealthSummary:
   - Add isError prop when data fetching fails
   - Optionally customize errorMessage
   - Component will show error UI instead of data or loading skeleton

2. For EnvironmentalInfoSquares:
   - Add isAirQualityError prop when air quality API fails
   - Add isTrafficError prop when traffic API fails
   - Customize error messages with airQualityErrorMessage and trafficErrorMessage
   - Component will show error icons and messages in the squares
   - Modal dialogs will also show appropriate error states

Example integration:

const YourMainComponent = () => {
  const [healthData, setHealthData] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [trafficData, setTrafficData] = useState(null);
  const [errors, setErrors] = useState({
    health: false,
    airQuality: false,
    traffic: false,
  });

  const fetchData = async () => {
    try {
      // Fetch health data
      const healthResponse = await fetch('/api/health');
      if (!healthResponse.ok) {
        setErrors(prev => ({ ...prev, health: true }));
      } else {
        const health = await healthResponse.json();
        setHealthData(health);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, health: true }));
    }

    // Similar pattern for air quality and traffic...
  };

  return (
    <View>
      <HealthSummary
        userProfile={healthData?.userProfile}
        airQuality={airQuality}
        isError={errors.health}
        errorMessage="Unable to load health metrics"
      />
      
      <EnvironmentalInfoSquares
        airQuality={airQuality}
        trafficData={trafficData}
        isAirQualityError={errors.airQuality}
        isTrafficError={errors.traffic}
        airQualityErrorMessage="Air quality service unavailable"
        trafficErrorMessage="Traffic service unavailable"
      />
    </View>
  );
};
*/
