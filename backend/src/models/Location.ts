export interface LocationSuggestion {
  placeId: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
  address: {
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
  };
}

export interface LocationAutocompleteResponse {
  success: boolean;
  data: LocationSuggestion[];
}

export interface LocationIQAutocompleteResult {
  place_id: string;
  osm_id?: string | number;
  osm_type?: string;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  class?: string;
  importance?: number;
  address?: {
    name?: string;
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}
