import React, { useMemo, useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import { FULL_SLEEP_MINUTES } from '../constants';
import { clamp } from '../utils/mathUtils';
import { useEnergyStore } from '../store/energyStore';
import EnergyInfoModal from './ui/EnergyInfoModal';
import { colors } from '../theme';

const BatteryIndicator = ({
  sleepMinutes,
}: {
  sleepMinutes?: number | null;
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const energyPct = useEnergyStore(s => s.energyPct);

  const hasSleep = useMemo(
    () => typeof energyPct === 'number' || (sleepMinutes ?? 0) > 0,
    [energyPct, sleepMinutes]
  );

  if (!hasSleep)
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}
        accessibilityLabel={`Energy battery: unknown percentage`}
      >
        <Pressable
          onPress={() => setShowInfo(true)}
          accessibilityRole="button"
          accessibilityHint="Opens an explanation of the energy battery"
          style={{
            flexDirection: 'row',
            paddingHorizontal: 4,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: colors.neutral[50],
            borderRadius: 4,
            backgroundColor: 'rgba(0,0,0,0.25)',
            alignItems: 'center',
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 4,
                height: 8,
                marginHorizontal: 1,
                borderRadius: 1,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: colors.neutral[50],
              }}
            />
          ))}
          <Text
            style={{
              marginLeft: 6,
              color: colors.neutral[50],
              fontSize: 10,
              fontWeight: '600',
            }}
          >
            ?
          </Text>
        </Pressable>
      </View>
    );

  // Compute display percentage from store or fallback from sleep minutes
  const pct = clamp(
    typeof energyPct === 'number'
      ? energyPct
      : clamp(((sleepMinutes ?? 0) / FULL_SLEEP_MINUTES) * 100)
  );

  // Map to 3 bars and color
  const totalBars = 3;
  const filledBars = pct >= 70 ? 3 : pct >= 30 ? 2 : pct > 0 ? 1 : 0;
  const color = pct < 30 ? '#EF4444' : pct < 70 ? '#F59E0B' : '#10B981';

  const bars = [] as React.ReactNode[];
  for (let i = 0; i < totalBars; i++) {
    bars.push(
      <View
        key={i}
        style={{
          width: 4,
          height: 8,
          marginHorizontal: 1,
          borderRadius: 1,
          backgroundColor: i < filledBars ? color : 'transparent',
          borderWidth: 1,
          borderColor: color,
        }}
      />
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}
      accessibilityLabel={`Energy battery: ${Math.round(pct)} percent`}
    >
      <Pressable
        onPress={() => setShowInfo(true)}
        accessibilityRole="button"
        accessibilityHint="Opens an explanation of the energy battery"
        style={{
          flexDirection: 'row',
          paddingHorizontal: 4,
          paddingVertical: 4,
          borderWidth: 1,
          borderColor: color,
          borderRadius: 4,
          backgroundColor: 'rgba(0,0,0,0.25)',
          alignItems: 'center',
        }}
      >
        {bars}
        <Text
          style={{
            marginLeft: 6,
            color,
            fontSize: 10,
            fontWeight: '600',
          }}
        >
          {`${Math.round(pct)}%`}
        </Text>
      </Pressable>

      <EnergyInfoModal visible={showInfo} onClose={() => setShowInfo(false)} />
    </View>
  );
};

export default BatteryIndicator;
