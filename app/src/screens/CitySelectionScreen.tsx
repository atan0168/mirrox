import React, { useState, useMemo } from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "../components/ui";
import { borderRadius, colors, fontSize, spacing } from "../theme";

interface City {
  id: string;
  name: string;
  state: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface CitySelectionScreenProps {
  navigation: any;
}

const MALAYSIAN_CITIES: City[] = [
  {
    id: "kl",
    name: "Kuala Lumpur",
    state: "Federal Territory",
    coordinates: { latitude: 3.139, longitude: 101.6869 },
  },
  {
    id: "george-town",
    name: "George Town",
    state: "Penang",
    coordinates: { latitude: 5.4164, longitude: 100.3327 },
  },
  {
    id: "johor-bahru",
    name: "Johor Bahru",
    state: "Johor",
    coordinates: { latitude: 1.4927, longitude: 103.7414 },
  },
  {
    id: "ipoh",
    name: "Ipoh",
    state: "Perak",
    coordinates: { latitude: 4.5975, longitude: 101.0901 },
  },
  {
    id: "shah-alam",
    name: "Shah Alam",
    state: "Selangor",
    coordinates: { latitude: 3.0733, longitude: 101.5185 },
  },
  {
    id: "petaling-jaya",
    name: "Petaling Jaya",
    state: "Selangor",
    coordinates: { latitude: 3.1073, longitude: 101.6067 },
  },
  {
    id: "malacca-city",
    name: "Malacca City",
    state: "Malacca",
    coordinates: { latitude: 2.2055, longitude: 102.2502 },
  },
  {
    id: "alor-setar",
    name: "Alor Setar",
    state: "Kedah",
    coordinates: { latitude: 6.1248, longitude: 100.3678 },
  },
  {
    id: "kota-kinabalu",
    name: "Kota Kinabalu",
    state: "Sabah",
    coordinates: { latitude: 5.9804, longitude: 116.0735 },
  },
  {
    id: "kuching",
    name: "Kuching",
    state: "Sarawak",
    coordinates: { latitude: 1.5535, longitude: 110.3593 },
  },
  {
    id: "kuantan",
    name: "Kuantan",
    state: "Pahang",
    coordinates: { latitude: 3.8077, longitude: 103.326 },
  },
  {
    id: "kota-bharu",
    name: "Kota Bharu",
    state: "Kelantan",
    coordinates: { latitude: 6.1248, longitude: 102.2386 },
  },
  {
    id: "kuala-terengganu",
    name: "Kuala Terengganu",
    state: "Terengganu",
    coordinates: { latitude: 5.3302, longitude: 103.1408 },
  },
  {
    id: "seremban",
    name: "Seremban",
    state: "Negeri Sembilan",
    coordinates: { latitude: 2.7297, longitude: 101.9381 },
  },
  {
    id: "putrajaya",
    name: "Putrajaya",
    state: "Federal Territory",
    coordinates: { latitude: 2.9264, longitude: 101.6964 },
  },
  {
    id: "cyberjaya",
    name: "Cyberjaya",
    state: "Selangor",
    coordinates: { latitude: 2.9213, longitude: 101.6559 },
  },
  {
    id: "klang",
    name: "Klang",
    state: "Selangor",
    coordinates: { latitude: 3.0319, longitude: 101.4443 },
  },
  {
    id: "subang-jaya",
    name: "Subang Jaya",
    state: "Selangor",
    coordinates: { latitude: 3.1478, longitude: 101.5811 },
  },
  {
    id: "ampang",
    name: "Ampang",
    state: "Selangor",
    coordinates: { latitude: 3.1478, longitude: 101.7617 },
  },
  {
    id: "kajang",
    name: "Kajang",
    state: "Selangor",
    coordinates: { latitude: 2.9929, longitude: 101.7904 },
  },
];

const CitySelectionScreen: React.FC<CitySelectionScreenProps> = ({
  navigation,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return MALAYSIAN_CITIES;

    return MALAYSIAN_CITIES.filter(
      (city) =>
        city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        city.state.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
  };

  const handleContinue = () => {
    if (selectedCity) {
      navigation.navigate("Questionnaire", {
        location: {
          latitude: selectedCity.coordinates.latitude,
          longitude: selectedCity.coordinates.longitude,
          city: selectedCity.name,
          state: selectedCity.state,
        },
      });
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const renderCityItem = ({ item }: { item: City }) => (
    <TouchableOpacity
      style={[
        styles.cityItem,
        selectedCity?.id === item.id && styles.selectedCityItem,
      ]}
      onPress={() => handleCitySelect(item)}
    >
      <View style={styles.cityInfo}>
        <Text style={styles.cityName}>{item.name}</Text>
        <Text style={styles.stateName}>{item.state}</Text>
      </View>
      {selectedCity?.id === item.id && (
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={colors.neutral[600]}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={colors.neutral[600]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Your City</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.searchContainer}>
          <Input
            placeholder="Search cities..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            size="lg"
            rightElement={
              <Ionicons name="search" size={20} color={colors.neutral[400]} />
            }
          />
        </View>

        <FlatList
          data={filteredCities}
          renderItem={renderCityItem}
          keyExtractor={(item) => item.id}
          style={styles.cityList}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        <View style={styles.buttonContainer}>
          <Button
            fullWidth
            variant="secondary"
            size="lg"
            disabled={!selectedCity}
            onPress={handleContinue}
          >
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.black,
  },
  placeholder: {
    width: 40, // Same width as back button for centering
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cityList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  selectedCityItem: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: fontSize.base,
    fontWeight: "500",
    color: colors.black,
    marginBottom: spacing.xs,
  },
  stateName: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  separator: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginLeft: spacing.md,
  },
  buttonContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
});

export default CitySelectionScreen;
