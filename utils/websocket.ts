import axios from "axios";
import Echo from "laravel-echo";
import * as Pusher from "pusher-js";

declare global {
  interface Window {
    Echo: Echo<any>;
    Pusher: typeof import("pusher-js");
  }
}

let echo: Echo<any> | null = null;

export function initializeWebSocket() {
  // const token = localStorage.getItem("token");
  const token =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vMTkyLjE2OC4xLjY4OjgwMDAvYXBpL3YxL2F1dGgvbG9naW4iLCJpYXQiOjE3Mzg5MTYwMDcsImV4cCI6MTc0MTUwODAwNywibmJmIjoxNzM4OTE2MDA3LCJqdGkiOiJqaEpnejR3YTBESEd5YWFxIiwic3ViIjoiMTMyNCIsInBydiI6IjkxOWMzMjZkNDNhYjE1MTlhOGJhM2I4NTg2YjY4NzUyZThjODM4MDcifQ.6y2R6SqQhPXBF6i64DDii2Ppyc4s_fT3HNU8b-qGbWA";

  if (typeof window !== "undefined" && !window.Echo) {
    window.Pusher = Pusher;

    window.Echo = new Echo({
      broadcaster: "pusher",
      key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
      wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
      wsPort: process.env.NEXT_PUBLIC_REVERB_PORT,
      forceTLS: false,
      disableStats: true,
      enabledTransports: ["ws", "wss"],
      encrypted: false,
      cluster: process.env.NEXT_PUBLIC_REVERB_CLUSTER || "mt1",
      // Add authentication configuration
      authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest", // ✅ Ensure this header is included
        },
      },
    });

    // const checkStatus = async () => {
    //   const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/websocket/status`);
    //   console.log(response);
      
    // };

    console.log("✅ WebSocket initialized");

    const connection = window.Echo.connector.pusher.connection;

    connection.bind("connected", () => {
      console.log("✅ WebSocket connected successfully!");
    });

    connection.bind("error", (error: any) => {
      console.error("❌ WebSocket connection error:", error);
    });

    connection.bind("disconnected", () => {
      console.warn("⚠️ WebSocket disconnected");
    });
  }
}

export function subscribeToChannel(
  channelName: string,
  eventName: string,
  callback: (data: any) => void
) {
  if (typeof window === "undefined" || !window.Echo) {
    console.error("❌ WebSocket is not initialized");
    return;
  }

  if (typeof callback !== "function") {
    console.error("❌ Callback is not a function", callback);
    return;
  }

  console.log(
    `📡 Subscribing to channel: ${channelName} for event: ${eventName}`
  );

  // Use private channel for authenticated channels
  const channel = channelName.startsWith("private-")
    ? window.Echo.private(channelName.replace("private-", ""))
    : window.Echo.channel(channelName);

  channel
    .listen(eventName, (data: any) => {
      console.log(
        `📥 Received event: ${eventName} in channel: ${channelName}`,
        data
      );
      try {
        callback(data);
      } catch (error) {
        console.error("❌ Error in callback execution:", error);
      }
    })
    .error((error: any) => {
      // console.error(`❌ Error in channel subscription: ${channelName}`, error);
    });

  return () => {
    channel.stopListening(eventName);
  };
}

export function leaveChannel(channelName: string) {
  if (typeof window !== "undefined" && window.Echo) {
    console.log(`🔴 Leaving channel: ${channelName}`);
    window.Echo.leaveChannel(channelName);
  } else {
    console.warn("⚠️ Cannot leave channel: WebSocket not initialized.");
  }
}
