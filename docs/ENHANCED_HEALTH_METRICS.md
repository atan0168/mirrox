# Enhanced Health Metrics System

## Overview

The Enhanced Health Metrics System provides a comprehensive, evidence-based approach to calculating and visualizing health impacts for the digital twin. This system supports **Epic 1 (Digital Twin Genesis & Personalization)** and **Epic 2 (The Living Environment Engine)** by providing real-time health calculations that respond to environmental changes and lifestyle factors.

## Academic Foundation

The health calculations are based on peer-reviewed research and established health guidelines:

### 1. Sleep & Energy Calculations

- **Reference**: Walker, M. (2017). "Why We Sleep: Unlocking the Power of Sleep and Dreams"
- **Implementation**: Sleep duration directly correlates with cognitive performance and energy levels
- **Formula**: Base energy from sleep duration + quality modifier + work-life balance adjustment
- **Key Findings**:
  - 7-9 hours optimal for adults
  - Sleep quality significantly impacts energy restoration
  - Work hours >10/day reduce energy recovery

### 2. Air Quality & Lung Health

- **Reference**: WHO Air Quality Guidelines (2021) & Pope et al. (2002) "Lung cancer, cardiopulmonary mortality, and long-term exposure to fine particulate air pollution"
- **Implementation**: Multi-pollutant model focusing on PM2.5 as primary indicator
- **Formula**: Base lung health (100%) - PM2.5 impact - PM10 impact - NO2 impact - O3 impact + lifestyle modifiers
- **Key Thresholds**:
  - PM2.5 ≤ 5 μg/m³: WHO recommended annual average
  - PM2.5 > 35 μg/m³: Unhealthy air quality (-20 points)
  - NO2 > 40 μg/m³: WHO annual guideline exceeded (-5 points)

### 3. UV & Skin Health

- **Reference**: Diffey, B.L. (2002) "Sources and measurement of ultraviolet radiation"
- **Implementation**: Multi-factor skin health model
- **Formula**: Base skin health + sleep impact + UV exposure impact + pollution impact + stress impact + commute modifiers
- **Key Factors**:
  - Sleep 8+ hours: +20 points (optimal skin repair)
  - UV Index >7: -15 points (skin damage risk)
  - High stress: -15 points (affects skin health)

### 4. Traffic Stress & Cognitive Function

- **Reference**: Evans & Johnson (2000) "Stress and open-office noise" & cognitive performance research
- **Implementation**: Environmental stress model
- **Formula**: Base cognitive function + sleep impact - air pollution impact - stress impact - work fatigue
- **Key Impacts**:
  - PM2.5 can cross blood-brain barrier affecting cognition
  - High traffic stress reduces cognitive performance
  - Sleep deprivation severely impacts mental function

### 5. Circadian Rhythm Integration

- **Reference**: Roenneberg & Merrow (2016) "The Circadian Clock and Human Health"
- **Implementation**: Time-aware health calculations
- **Features**: Work hours impact on energy, sleep quality assessment

## System Architecture

### Core Components

#### 1. Health Metrics Utilities (`app/src/utils/healthMetrics.tsx`)

- **Enhanced calculation functions** with academic backing
- **Multi-factor health models** for comprehensive assessment
- **Backward compatibility** with existing simple functions
- **Detailed explanations** for each metric

#### 2. Health Metrics Service (`app/src/services/HealthMetricsService.ts`)

- **Centralized health calculations** integrating all data sources
- **Health trend analysis** over time
- **Alert generation** for health risks
- **Recommendation engine** for actionable advice

#### 3. Health Metrics Hook (`app/src/hooks/useHealthMetrics.ts`)

- **React integration** for real-time health updates
- **Data source integration** (air quality, traffic, user profile)
- **Error handling** and loading states
- **Automatic refresh** with configurable intervals

#### 4. Enhanced Health Summary Component (`app/src/components/ui/EnhancedHealthSummary.tsx`)

- **Visual health dashboard** with trends and alerts
- **Interactive metric exploration**
- **Alert management** with dismiss functionality
- **Responsive design** with compact mode

### Data Flow

```
Environmental Data (Air Quality, Traffic)
    ↓
User Profile & Lifestyle Data
    ↓
Health Metrics Service
    ↓
Real-time Health Calculations
    ↓
Visual Health Dashboard
    ↓
User Alerts & Recommendations
```

## Health Metrics Explained

### 1. Energy Level (0-100%)

**Calculation**: Based on sleep duration, quality, and work-life balance

Sleep → Energy mapping:

- 9+ hours → 95%
- 8–8.9 hours → 90%
- 7–7.9 hours → 80%
- 6–6.9 hours → 65%
- 5–5.9 hours → 45%
- 4–4.9 hours → 30%
- <4 hours → 15%
- Missing sleep hours → default 50%

**Modifiers**:

- Sleep quality: ±15%
- Work hours >10/day: -10%
- Work hours <4/day: +5%

### 2. Lung Health (0-100%)

**Calculation**: Multi-pollutant impact model

- **Base**: 100% (perfect health)
- **PM2.5 Impact**: Most critical pollutant
  - ≤5 μg/m³: No impact (WHO guideline)
  - 5-15 μg/m³: -5% (moderate)
  - 15-25 μg/m³: -10% (unhealthy for sensitive)
  - 25-35 μg/m³: -15% (unhealthy)
  - > 35 μg/m³: -20% (very unhealthy)

**Additional Pollutants**:

- PM10, NO2, O3 with graduated impacts
- Lifestyle modifiers for commute method and exercise

### 3. Skin Health (0-100%)

**Calculation**: Multi-factor skin health model

- **Base**: 75% (baseline skin health)
- **Sleep Impact**: Major factor for skin repair
  - 8+ hours: +20%
  - 7+ hours: +15%
  - 6+ hours: +5%
  - <5 hours: -15%

**Environmental Factors**:

- UV Index >10: -20% (extreme exposure)
- PM2.5 >35: -15% (oxidative stress)
- High stress: -15% (affects skin health)

### 4. Cognitive Function (0-100%)

**Calculation**: Sleep, air quality, and stress impact

- **Base**: 80% (baseline cognitive function)
- **Sleep Impact**: Critical for cognition
  - 8+ hours: +15%
  - 7+ hours: +10%
  - <6 hours: -15 to -25%

**Environmental Impact**:

- PM2.5 >35: -15% (blood-brain barrier effects)
- High stress: -20%
- Work hours >10: -15%

### 5. Stress Index (0-100, lower is better)

**Calculation**: Environmental and lifestyle stressors

- **Base**: 20% (baseline stress)
- **Traffic Stress**: Based on congestion data
- **Commute Duration**: >60 min = +15%
- **Work Hours**: >10 hours = +20%
- **Sleep Deprivation**: <6 hours = +15%
- **Air Quality**: Poor AQI = +15%

### 6. Overall Health (0-100%)

**Calculation**: Weighted average of all metrics

- Energy: 25%
- Lung Health: 30%
- Skin Health: 15%
- Cognitive Function: 20%
- Stress (inverted): 10%

## Alert System

### Alert Types

1. **Critical**: Immediate health risks (severity 8-10)
2. **Warning**: Moderate health concerns (severity 5-7)
3. **Info**: General health information (severity 1-4)

### Alert Triggers

- **Air Quality**: PM2.5 >35 μg/m³ (critical), >25 μg/m³ (warning)
- **UV Exposure**: UV Index >7 (warning)
- **Sleep Deprivation**: <6 hours (warning)
- **High Stress**: Stress index >70 (warning)
- **Overall Health**: <40% (critical)

### Recommendations Engine

Provides actionable advice based on current conditions:

- **Air Quality**: Mask recommendations, indoor air purification
- **UV Protection**: Sunscreen, protective clothing
- **Sleep**: Sleep hygiene recommendations
- **Stress**: Break suggestions, relaxation techniques
- **Exercise**: Activity recommendations based on conditions

## Integration with Digital Twin

### Epic 1: Digital Twin Genesis

- **Instant Health Assessment**: Immediate health baseline from location and basic inputs
- **Personalized Metrics**: Calculations adapted to user profile
- **Simple Onboarding**: Quick health overview without complex setup

### Epic 2: Living Environment Engine

- **Real-time Updates**: Health metrics respond to environmental changes
- **Visual Feedback**: Health impacts visible on digital twin
- **Environmental Storytelling**: Makes invisible health impacts visible

### Visual Manifestations

The health metrics drive visual changes in the digital twin:

- **Energy**: Avatar posture, animation speed, eye brightness
- **Lung Health**: Breathing patterns, smog effects around avatar
- **Skin Health**: Skin tone, glow effects, aging indicators
- **Cognitive Function**: Focus indicators, reaction animations
- **Stress**: Tension posture, stress aura, facial expressions

## Usage Examples

### Basic Integration

```typescript
import { useHealthMetrics } from '../hooks/useHealthMetrics';

const MyComponent = () => {
  const { healthMetrics, alerts, recommendations } = useHealthMetrics();

  return (
    <View>
      <Text>Overall Health: {healthMetrics?.overallHealth}%</Text>
      <Text>Active Alerts: {alerts.length}</Text>
    </View>
  );
};
```

### Advanced Integration with User Inputs

```typescript
const { healthMetrics, updateUserInputs } = useHealthMetrics({
  userInputs: {
    sleepHours: 7,
    sleepQuality: 'good',
    workHours: 8,
    exerciseMinutes: 30,
  },
});

// Update sleep data
updateUserInputs({ sleepHours: 8, sleepQuality: 'excellent' });
```

### Enhanced Health Dashboard

```typescript
import { EnhancedHealthSummary } from '../components/ui';

const HealthDashboard = () => (
  <EnhancedHealthSummary
    showTrends={true}
    showAlerts={true}
    showRecommendations={true}
    onMetricPress={(metric) => console.log(`Pressed ${metric}`)}
  />
);
```

## Future Enhancements

### Planned Features

1. **Historical Analysis**: Long-term health trend analysis
2. **Predictive Modeling**: Future health projections
3. **Personalization**: Machine learning for individual health patterns
4. **Integration**: Additional data sources (weather, nutrition, exercise)
5. **Gamification**: Health improvement challenges and rewards

### Data Sources for Future Epics

- **Epic 3 (Diet)**: Nutrition impact on skin, energy, cognitive function
- **Epic 4 (Disease Outbreaks)**: Immunity and vulnerability calculations
- **Epic 5 (Stress & Burnout)**: Advanced stress modeling with heart rate, sleep quality
- **Epic 6 (Actionable Nudges)**: Behavior change tracking and rewards
- **Epic 7 (Social Features)**: Comparative health metrics and challenges
- **Epic 8 (Long-term Aging)**: Accelerated aging models and projections

## Performance Considerations

### Optimization Strategies

1. **Caching**: Health calculations cached for 5 minutes
2. **Incremental Updates**: Only recalculate when data changes
3. **Background Processing**: Heavy calculations in service layer
4. **Lazy Loading**: Components load health data on demand

### Data Management

1. **History Pruning**: Keep only 30 days of health history
2. **Alert Deduplication**: Remove duplicate and old alerts
3. **Efficient Queries**: Optimized data fetching with React Query

## Testing and Validation

### Unit Tests

- Health calculation accuracy
- Alert generation logic
- Recommendation engine
- Data integration

### Integration Tests

- Real-time data updates
- Component interactions
- Error handling
- Performance benchmarks

### Validation Against Research

- Calculations validated against published health guidelines
- Regular updates based on new research
- Expert review of health models

## Conclusion

The Enhanced Health Metrics System provides a robust, scientifically-grounded foundation for the digital twin health visualization. By integrating real-time environmental data with evidence-based health calculations, it creates an engaging and informative health experience that motivates users to make positive lifestyle changes.

The system is designed to be extensible, allowing for easy integration of additional health factors and data sources as the product evolves through subsequent epics.
