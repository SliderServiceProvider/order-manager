import { useEffect, useRef, useState } from "react";

interface WebSocketState {
  isConnected: boolean;
  error: string | null;
}

interface EventHandler {
  event: string;
  handler: (data: any) => void;
}

interface WebSocketOptions {
  channelName: string;
  events: EventHandler[];
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

/**
 * Custom hook for managing WebSocket connections with authentication and channel subscription
 */
const useWebSocket = ({
  channelName,
  events,
  maxReconnectAttempts = 5,
  reconnectDelay = 1000,
  heartbeatInterval = 30000,
}: WebSocketOptions): WebSocketState => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatTimerRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  const [wsState, setWsState] = useState<WebSocketState>({
    isConnected: false,
    error: null,
  });

  const WEBSOCKET_URL = `${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`;
  const AUTH_TOKEN =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vMTkyLjE2OC4xLjY4OjgwMDAvYXBpL3YxL2F1dGgvbG9naW4iLCJpYXQiOjE3NDAwNDI0ODEsImV4cCI6MTc0MjYzNDQ4MSwibmJmIjoxNzQwMDQyNDgxLCJqdGkiOiJXT0h0blhSb1dRYkp0RmNkIiwic3ViIjoiMTMyNCIsInBydiI6IjkxOWMzMjZkNDNhYjE1MTlhOGJhM2I4NTg2YjY4NzUyZThjODM4MDcifQ.a_oERYaneeHJRo7VKh50cSSNWJpjGEjxGrQJlQCp9ys";

  // Helper function to safely parse JSON string data
  const safeJsonParse = (data: string) => {
    try {
      // First attempt to parse the string
      const parsed = JSON.parse(data);

      // If the data property is a string, try to parse it as well
      if (parsed.data && typeof parsed.data === "string") {
        try {
          parsed.data = JSON.parse(parsed.data);
        } catch (e) {
          // If parsing data fails, keep it as is
          console.log(
            "Secondary parsing of data property failed, keeping original"
          );
        }
      }

      return parsed;
    } catch (e) {
      console.error("JSON parsing failed:", e);
      return null;
    }
  };

  const cleanupWebSocket = () => {
    // Clear any pending timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = undefined;
    }

    // Close WebSocket if it exists and is not already closed
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      try {
        wsRef.current.onclose = null; // Remove onclose handler to prevent reconnection
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.onopen = null;
        wsRef.current.close();
      } catch (error) {
        console.error("Error closing WebSocket:", error);
      }
    }
    wsRef.current = null;
  };

  const connectWebSocket = () => {
    // Clean up existing connection first
    cleanupWebSocket();

    try {
      console.log("Connecting to WebSocket...");
      const ws = new WebSocket(WEBSOCKET_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;

        console.log("WebSocket connected");
        reconnectAttemptsRef.current = 0;
        setWsState({ isConnected: true, error: null });

        // Setup heartbeat only after successful connection
        heartbeatTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: "pusher:ping", data: {} }));
          }
        }, heartbeatInterval);
      };

      ws.onmessage = async (event) => {
        if (!mountedRef.current) return;

        try {
          const data = JSON.parse(event.data);

          if (data.event === "pusher:connection_established") {
            const { socket_id } = JSON.parse(data.data);
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/broadcasting/auth`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                  },
                  body: JSON.stringify({
                    socket_id,
                    channel_name: channelName,
                  }),
                }
              );

              if (!response.ok) {
                throw new Error(`Auth failed with status: ${response.status}`);
              }

              const authData = await response.json();
              if (ws.readyState === WebSocket.OPEN) {
                const subscribeMessage = {
                  event: "pusher:subscribe",
                  data: {
                    channel: channelName,
                    auth: authData.auth,
                  },
                };
                ws.send(JSON.stringify(subscribeMessage));
              }
            } catch (error) {
              console.error("Auth request error:", error);
              setWsState((prev) => ({
                ...prev,
                error: "Authentication failed",
              }));
            }
          } else {
            const eventHandler = events.find((e) => e.event === data.event);
            if (eventHandler) {
              // Parse the data property if it's a string
              const eventData =
                typeof data.data === "string"
                  ? safeJsonParse(data.data)
                  : data.data;
              eventHandler.handler(eventData || data);
              //   eventHandler.handler(data.data);
            }
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;

        console.log(`WebSocket closed with code ${event.code}`);
        setWsState((prev) => ({ ...prev, isConnected: false }));

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay =
            reconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`Attempting to reconnect in ${delay / 1000} seconds...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              reconnectAttemptsRef.current++;
              connectWebSocket();
            }
          }, delay);
        } else {
          setWsState((prev) => ({
            ...prev,
            error:
              "Max reconnection attempts reached. Please refresh the page.",
          }));
        }
      };

      ws.onerror = (error) => {
        if (!mountedRef.current) return;
        console.error("WebSocket error:", error);
        // setWsState((prev) => ({ ...prev, error: "WebSocket error occurred" }));
      };
    } catch (error) {
      console.error("WebSocket setup error:", error);
    //   setWsState((prev) => ({ ...prev, error: "Failed to setup WebSocket" }));
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    connectWebSocket();

    return () => {
      mountedRef.current = false;
      cleanupWebSocket();
    };
  }, [channelName]); // Reconnect if these dependencies change

  return wsState;
};

export default useWebSocket;
