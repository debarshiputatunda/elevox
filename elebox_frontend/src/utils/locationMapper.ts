import type { CityOption, CountryOption, Location, LocationFormValues } from '@/types';

export interface BackendLocation {
  location_id: number;
  location_name: string;
  country_id: number;
  country_name?: string | null;
  city_id: number;
  city_name?: string | null;
}

export interface BackendCountry {
  country_id: number;
  country_name: string;
}

export interface BackendCity {
  city_id: number;
  city_name: string;
}

export const mapBackendLocation = (data: BackendLocation): Location => ({
  id: data.location_id,
  name: data.location_name,
  countryId: data.country_id,
  countryName: data.country_name ?? undefined,
  cityId: data.city_id,
  cityName: data.city_name ?? undefined,
});

export const mapBackendCountry = (data: BackendCountry): CountryOption => ({
  id: data.country_id,
  name: data.country_name,
});

export const mapBackendCity = (data: BackendCity): CityOption => ({
  id: data.city_id,
  name: data.city_name,
});

export const mapLocationFormToCreateRequest = (values: LocationFormValues) => ({
  country_id: values.countryId,
  city_id: values.cityId,
  location_name: values.name.trim(),
});

export const mapLocationFormToUpdateRequest = (values: LocationFormValues) => ({
  country_id: values.countryId,
  city_id: values.cityId,
  location_name: values.name.trim(),
});
