import * as Location from 'expo-location';
import { LocationSuggestion } from '../models/Location';
import { UserLocationDetails } from '../models/User';

const deriveCityFromSuggestion = (suggestion: LocationSuggestion) => {
  const { address } = suggestion;
  return (
    address.city ||
    address.suburb ||
    address.neighbourhood ||
    address.county ||
    null
  );
};

export const locationSuggestionToUserLocation = (
  suggestion: LocationSuggestion
): UserLocationDetails => ({
  coordinates: {
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
  },
  label: suggestion.displayName,
  address: suggestion.displayName,
  city: deriveCityFromSuggestion(suggestion),
  state: suggestion.address.state ?? null,
  country: suggestion.address.country ?? null,
  countryCode: suggestion.address.countryCode ?? null,
  postcode: suggestion.address.postcode ?? null,
});

export const placemarkToUserLocation = (
  coords: Location.LocationObjectCoords,
  placemark: Location.LocationGeocodedAddress | null
): UserLocationDetails => {
  const city =
    placemark?.city ||
    placemark?.district ||
    placemark?.subregion ||
    placemark?.region ||
    placemark?.name ||
    null;

  const labelParts = [
    placemark?.name,
    placemark?.street,
    placemark?.city,
    placemark?.region,
    placemark?.country,
  ].filter(Boolean);

  const label =
    labelParts.length > 0
      ? labelParts.join(', ')
      : `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;

  return {
    coordinates: {
      latitude: coords.latitude,
      longitude: coords.longitude,
    },
    label,
    address: placemark?.name || label,
    city,
    state: placemark?.region || placemark?.subregion || null,
    country: placemark?.country || null,
    countryCode: placemark?.isoCountryCode || null,
    postcode: placemark?.postalCode || null,
  };
};
