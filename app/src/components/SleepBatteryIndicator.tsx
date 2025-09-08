import { View } from 'react-native';

const SleepBatteryIndicator = ({
  sleepMinutes,
}: {
  sleepMinutes?: number | null;
}) => {
  if (sleepMinutes == null || sleepMinutes <= 0) return null; // No data yet
  const hours = sleepMinutes / 60;
  const totalBars = 3;
  let filledBars = 0;
  // Color thresholds: red <6h, orange 6-7.5h, green >=7.5h
  let color = '#10B981';
  if (hours < 6) {
    color = '#EF4444';
    filledBars = 1;
  } else if (hours < 7) {
    color = '#F59E0B';
    filledBars = 2;
  } else {
    color = '#10B981';
    filledBars = 3;
  }
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
        position: 'absolute',
        bottom: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      accessibilityLabel={`Sleep battery: ${hours.toFixed(1)} hours`}
    >
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 4,
          paddingVertical: 4,
          borderWidth: 1,
          borderColor: color,
          borderRadius: 4,
          backgroundColor: 'rgba(0,0,0,0.25)',
        }}
      >
        {bars}
      </View>
    </View>
  );
};
export default SleepBatteryIndicator;
