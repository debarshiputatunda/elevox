import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { upsertNotificationFromSocket } from '@/store/slices/notificationsSlice';
import { markDeviceOffline, updateDevice } from '@/store/slices/telemetrySlice';
import { setWebSocketStatus } from '@/store/slices/websocketSlice';
import { telemetrySubscriptionRegistry } from '@/services/telemetrySubscriptionRegistry';
import { isOfflineNotificationType } from '@/utils/deviceConnectivity';
import { mapBackendTelemetry, type BackendTelemetrySnapshot } from '@/utils/telemetryMapper';

export const useTelemetryWebSocketBootstrap = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth.user));

  useEffect(() => {
    if (!isAuthenticated) {
      telemetrySubscriptionRegistry.disconnect();
      dispatch(setWebSocketStatus('disconnected'));
      return;
    }

    telemetrySubscriptionRegistry.setHandlers(
      (message) => {
        if (message.type === 'telemetry') {
          dispatch(updateDevice(
            mapBackendTelemetry(message.data as unknown as BackendTelemetrySnapshot),
          ));
        }
        if (message.type === 'notification') {
          dispatch(upsertNotificationFromSocket(message.data));
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          if (isOfflineNotificationType(message.data.notification_type)) {
            const boxId = Number(message.data.device_id ?? message.data.box_id);
            if (Number.isFinite(boxId)) {
              dispatch(markDeviceOffline(boxId));
            }
          }
        }
      },
      (status) => dispatch(setWebSocketStatus(status)),
    );
    telemetrySubscriptionRegistry.connect();

    return () => {
      telemetrySubscriptionRegistry.disconnect();
    };
  }, [dispatch, isAuthenticated, queryClient]);
};

export const useDeviceTelemetrySubscription = (
  subscriptionId: string,
  boxIds: number[],
  highPriorityBoxIds: number[] = [],
) => {
  const key = boxIds.join(',');
  const priorityKey = highPriorityBoxIds.join(',');

  useEffect(() => {
    telemetrySubscriptionRegistry.register(subscriptionId, boxIds, highPriorityBoxIds);
    return () => {
      telemetrySubscriptionRegistry.unregister(subscriptionId);
    };
  }, [subscriptionId, key, priorityKey, boxIds, highPriorityBoxIds]);
};
