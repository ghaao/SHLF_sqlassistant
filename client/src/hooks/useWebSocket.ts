import { useState, useEffect, useRef, useCallback } from 'react';

// connect 함수를 반환하도록 인터페이스 수정
interface WebSocketHook {
  sendMessage: (message: any) => void;
  lastMessage: MessageEvent | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  connect: () => void; // 연결을 시작하는 함수
}

export const useWebSocket = (): WebSocketHook => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  // 연결을 시작할지 여부를 제어하는 상태
  const [shouldConnect, setShouldConnect] = useState(false);

  const connect = useCallback(() => {
    setShouldConnect(true);
  }, []);

  useEffect(() => {
    // shouldConnect가 true일 때만 연결을 시도
    if (!shouldConnect) {
      return;
    }

    setConnectionStatus('connecting');
    const ws = new WebSocket(`ws://${window.location.host}`);

    ws.onopen = () => setConnectionStatus('connected');
    ws.onclose = () => setConnectionStatus('disconnected');
    ws.onmessage = (event) => setLastMessage(event);
    ws.onerror = (error) => console.error('WebSocket error:', error);

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [shouldConnect]); // shouldConnect 상태가 변경될 때 이 useEffect가 실행됨

  const sendMessage = useCallback((message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, [socket]);

  return { sendMessage, lastMessage, connectionStatus, connect };
};