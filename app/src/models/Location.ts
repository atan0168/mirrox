export interface LocationSuggestionAddress {
  name?: string;
  houseNumber?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
}

export interface LocationSuggestion {
  placeId: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
  address: LocationSuggestionAddress;
}

export interface LocationAutocompleteResponse {
  success: boolean;
  data: LocationSuggestion[];
  error?: string;
}
