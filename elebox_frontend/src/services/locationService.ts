import { apiClient, isMockMode } from '@/api/client';
import { MOCK_CITIES, MOCK_COUNTRIES, MOCK_LOCATIONS } from '@/mocks/data';
import type {
  CityOption,
  CountryOption,
  ListParams,
  Location,
  LocationFormValues,
  PaginatedResponse,
} from '@/types';
import { delay, paginate } from '@/utils/helpers';
import {
  type BackendCity,
  type BackendCountry,
  type BackendLocation,
  mapBackendCity,
  mapBackendCountry,
  mapBackendLocation,
  mapLocationFormToCreateRequest,
  mapLocationFormToUpdateRequest,
} from '@/utils/locationMapper';

const locationsStore = { current: [...MOCK_LOCATIONS] };

export const locationService = {
  getAll: async (params?: ListParams): Promise<PaginatedResponse<Location>> => {
    if (isMockMode()) {
      await delay(400);
      return paginate(locationsStore.current, params);
    }

    const { data } = await apiClient.get<BackendLocation[]>('/locations');
    const locations = data.map(mapBackendLocation);
    return paginate(locations, params);
  },

  list: async (): Promise<Location[]> => {
    const response = await locationService.getAll({ pageSize: 1000 });
    return response.data;
  },

  listCountries: async (): Promise<CountryOption[]> => {
    if (isMockMode()) {
      await delay(200);
      return MOCK_COUNTRIES;
    }

    const { data } = await apiClient.get<BackendCountry[]>('/locations/countries');
    return data.map(mapBackendCountry);
  },

  listCities: async (): Promise<CityOption[]> => {
    if (isMockMode()) {
      await delay(200);
      return MOCK_CITIES;
    }

    const { data } = await apiClient.get<BackendCity[]>('/locations/cities');
    return data.map(mapBackendCity);
  },

  getById: async (id: number): Promise<Location> => {
    if (isMockMode()) {
      await delay(300);
      const item = locationsStore.current.find((i) => i.id === id);
      if (!item) throw { message: 'Location not found', status: 404 };
      return item;
    }

    const { data } = await apiClient.get<BackendLocation>(`/locations/${id}`);
    return mapBackendLocation(data);
  },

  create: async (values: LocationFormValues): Promise<Location> => {
    if (isMockMode()) {
      await delay(400);
      const country = MOCK_COUNTRIES.find((c) => c.id === values.countryId);
      const city = MOCK_CITIES.find((c) => c.id === values.cityId);
      const item: Location = {
        id: Date.now(),
        name: values.name.trim(),
        countryId: values.countryId,
        countryName: country?.name,
        cityId: values.cityId,
        cityName: city?.name,
      };
      locationsStore.current = [...locationsStore.current, item];
      return item;
    }

    const { data } = await apiClient.post<BackendLocation>(
      '/locations',
      mapLocationFormToCreateRequest(values),
    );
    return mapBackendLocation(data);
  },

  update: async (id: number, values: LocationFormValues): Promise<Location> => {
    if (isMockMode()) {
      await delay(400);
      const country = MOCK_COUNTRIES.find((c) => c.id === values.countryId);
      const city = MOCK_CITIES.find((c) => c.id === values.cityId);
      const item: Location = {
        id,
        name: values.name.trim(),
        countryId: values.countryId,
        countryName: country?.name,
        cityId: values.cityId,
        cityName: city?.name,
      };
      locationsStore.current = locationsStore.current.map((location) =>
        location.id === id ? item : location,
      );
      return item;
    }

    const { data } = await apiClient.put<BackendLocation>(
      `/locations/${id}`,
      mapLocationFormToUpdateRequest(values),
    );
    return mapBackendLocation(data);
  },

  delete: async (id: number): Promise<void> => {
    if (isMockMode()) {
      await delay(300);
      locationsStore.current = locationsStore.current.filter((i) => i.id !== id);
      return;
    }

    await apiClient.delete(`/locations/${id}`);
  },
};
