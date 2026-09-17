import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WebSocketConnectionStatus } from '@/services/websocketService';

interface WebSocketState {
  status: WebSocketConnectionStatus;
}

const initialState: WebSocketState = {
  status: 'disconnected',
};

const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    setWebSocketStatus: (state, action: PayloadAction<WebSocketConnectionStatus>) => {
      state.status = action.payload;
    },
  },
});

export const { setWebSocketStatus } = websocketSlice.actions;
export default websocketSlice.reducer;
