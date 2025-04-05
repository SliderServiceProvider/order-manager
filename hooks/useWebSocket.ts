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
}

/**
 * Custom hook for managing WebSocket connections with authentication and channel subscription
 */
const useWebSocket = ({
  channelName,
  events,
}: WebSocketOptions): WebSocketState => {
  const wsRef = useRef<WebSocket | null>(null);

  const [wsState, setWsState] = useState<WebSocketState>({
    isConnected: false,
    error: null,
  });

  const WEBSOCKET_URL = `${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`;
  // const AUTH_TOKEN = localStorage.getItem("token");
  
  const AUTH_TOKEN =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwaS1zYW5kYm94LnNsaWRlci1hcHAuY29tL2FwaS92MS9hdXRoL2xvZ2luIiwiaWF0IjoxNzQzODMxMTU0LCJleHAiOjE3NDY0MjMxNTQsIm5iZiI6MTc0MzgzMTE1NCwianRpIjoiZ3puZGtIWm9MZEVENXd5SyIsInN1YiI6IjM1ODgiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.mLHEXI9-mKzA1FVbaG3SYZlqYLbB5wR46LUsPIDVIKQ";

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

  const connectWebSocket = () => {
    // Clean up existing connection first
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      console.log("Connecting to WebSocket...");
      const ws = new WebSocket(WEBSOCKET_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setWsState({ isConnected: true, error: null });
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          // Respond to server pings to prevent disconnects
          if (data.event === "pusher:ping") {
            console.log("Received ping from server. Sending pong.");
            ws.send(JSON.stringify({ event: "pusher:pong", data: {} }));
            return;
          }

          // Handle pong response (optional)
          if (data.type === "pong") {
            console.log("Received heartbeat pong");
            return;
          }

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
                    type: "user",
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
              console.log(data.event);
              // Parse the data property if it's a string
              const eventData =
                typeof data.data === "string"
                  ? safeJsonParse(data.data)
                  : data.data;
              eventHandler.handler(eventData || data);
            }
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setWsState((prev) => ({ ...prev, error: "WebSocket error occurred" }));
      };

      ws.onclose = (event) => {
        console.log(event);
        console.log(
          `WebSocket disconnected: code ${event.code}, reason: ${event.reason}`
        );
        setWsState((prev) => ({ ...prev, isConnected: false }));
      };
    } catch (error) {
      console.error("WebSocket setup error:", error);
      setWsState((prev) => ({ ...prev, error: "Failed to setup WebSocket" }));
    }

    // Return cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  };

  useEffect(() => {
    const cleanup = connectWebSocket();
    // Cleanup function for when the component unmounts or the dependencies change
    return cleanup;
  }, [channelName]); // Reconnect if these dependencies change

  return wsState;
};

export default useWebSocket;
