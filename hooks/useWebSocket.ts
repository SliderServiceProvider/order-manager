import { useEffect, useState } from "react";
import { initializeWebSocket, subscribeToChannel } from "@/utils/websocket";

export function useWebSocket(channelName: string, eventName: string) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    initializeWebSocket();
    setIsConnected(true);

    const unsubscribe = subscribeToChannel(channelName, eventName, (data) => {
      // Handle the received data here
      console.log("Received data:", data);
    });

    return () => {
      if (typeof window !== "undefined" && window.Echo) {
        window.Echo.leaveChannel(channelName);
      }
      setIsConnected(false);
    };
  }, [channelName, eventName]);

  return isConnected;
}
