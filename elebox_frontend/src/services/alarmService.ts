import { apiClient, isMockMode } from '@/api/client';
import { MOCK_ALARM_STATE } from '@/mocks/data';
import type { AlarmState } from '@/types';
import { delay } from '@/utils/helpers';

let alarmState = { ...MOCK_ALARM_STATE };

export const alarmService = {
  trigger: async (boxId: number): Promise<{ success: boolean; message: string }> => {
    if (isMockMode()) {
      await delay(400);
      alarmState = {
        ...alarmState,
        isActive: true,
        lastActivated: new Date().toISOString(),
      };
      return { success: true, message: 'Alarm triggered successfully' };
    }
    const { data } = await apiClient.post<{ success: boolean; message: string }>(
      `/alarms/${boxId}/trigger`,
    );
    return data;
  },

  getState: async (): Promise<AlarmState> => {
    if (isMockMode()) {
      await delay(300);
      return alarmState;
    }
    const { data } = await apiClient.get<AlarmState>('/alarms/state');
    return data;
  },

  activate: async (): Promise<AlarmState> => {
    if (isMockMode()) {
      await delay(400);
      alarmState = { ...alarmState, isActive: true, lastActivated: new Date().toISOString() };
      return alarmState;
    }
    const { data } = await apiClient.post<AlarmState>('/alarms/activate');
    return data;
  },

  deactivate: async (): Promise<AlarmState> => {
    if (isMockMode()) {
      await delay(400);
      alarmState = { ...alarmState, isActive: false };
      return alarmState;
    }
    const { data } = await apiClient.post<AlarmState>('/alarms/deactivate');
    return data;
  },

  reset: async (): Promise<AlarmState> => {
    if (isMockMode()) {
      await delay(400);
      alarmState = { isActive: false, activeAlerts: 0, criticalDevices: [] };
      return alarmState;
    }
    const { data } = await apiClient.post<AlarmState>('/alarms/reset');
    return data;
  },
};
