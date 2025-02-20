"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MoreVertical, Search, Send, ArrowLeft } from "lucide-react";
import api from "@/services/api";
import useWebSocket from "@/hooks/useWebSocket";

type Message = {
  id: number;
  order_id: number;
  sender_id: number;
  sender_type: string;
  receiver_id: number;
  receiver_type: string;
  message: string;
  created_at: string;
};

type ChatIndex = {
  id: number;
  avatar: string;
  order_id: number;
  order_number: number;
  driver: Driver;
};
type Driver = {
  id: number;
  name: string;
  image_url: string;
  avatar: string;
};

type Suggestions = {
  id: number;
  title: string;
};

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<ChatIndex | null>(null);
  const [drivers, setDrivers] = useState<ChatIndex[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestions[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesCacheRef = useRef<{ [key: number]: Message[] }>({});

  const fetchDrivers = useCallback(async () => {
    try {
      const response = await api.get("/order-manager/chat/getChatIndex");
      const responseData = response.data;
      setDrivers(responseData.chatList);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fetchDrivers]);

  const fetchMessages = useCallback(
    async (driverId: number, orderNumber: number) => {
      setLoading(true);
      try {
        // Check if we have cached messages for this driver
        if (messagesCacheRef.current[driverId]) {
          setMessages(messagesCacheRef.current[driverId]);
          setLoading(false);
          return;
        }
        const response = await api.get(
          `/order-manager/chat/messages?order_number=${orderNumber}`
        );
        const fetchedMessages = response.data.chat;
        // Update cache and state
        messagesCacheRef.current[driverId] = fetchedMessages;
        setMessages(fetchedMessages);
        setSuggestions(response.data.messageSuggestions);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const sendMessage = async () => {
    if (!selectedDriver || !message.trim()) return;

    setLoading(true);
    try {
      const response = await api.post("/chat/send-message", {
        order_id: selectedDriver.order_id,
        message: message,
        receiver_id: selectedDriver.driver.id,
      });

      const newMessage = response.data.data;

      // Immediately update the UI with the sent message
      if (selectedDriver.id) {
        messagesCacheRef.current[selectedDriver.id] = [
          ...(messagesCacheRef.current[selectedDriver.id] || []),
          newMessage,
        ];
      }

      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, newMessage];
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 0);
        return updatedMessages;
      });

      setMessage("");
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDriverSelect = (driver: ChatIndex) => {
    setSelectedDriver(driver);
    fetchMessages(driver.id, driver.order_number);
    // Focus the input field after a short delay to ensure the chat window is rendered
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };


  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    scrollToBottom();
    // Set up a short delay to scroll after the DOM has been updated
    const timeoutId = setTimeout(scrollToBottom, 100);

    return () => clearTimeout(timeoutId);
  }, [messages]);

  useEffect(() => {
    // Create the audio element
    audioRef.current = new Audio("/sounds/message-notification.mp3");

    // Preload the audio
    audioRef.current.load();

    // Optional: Log any errors that occur when setting up the audio
    audioRef.current.onerror = (e) => {
      console.error("Error setting up audio:", e);
    };

    return () => {
      // Cleanup
      if (audioRef.current) {
        audioRef.current.onerror = null;
      }
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error("Error playing sound:", error);
        // If autoplay is blocked, we can inform the user or try to play on user interaction
      });
    }
  }, []);

  const handleNewMessage = useCallback(
    (data: { message: Message }) => {
      const newMessage = data.message;

      // Only process the message if it's from the driver (not from the current user)
      if (newMessage.sender_type !== "user") {
        // Update both cache and state
        if (selectedDriver?.id) {
          messagesCacheRef.current[selectedDriver.id] = [
            ...(messagesCacheRef.current[selectedDriver.id] || []),
            newMessage,
          ];
        }

        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages, newMessage];
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 0);
          return updatedMessages;
        });

        playNotificationSound();
      }
    },
    [selectedDriver, playNotificationSound]
  );

  const renderDriverList = () => (
    <div className="w-full md:w-80 border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Drivers</h1>
          <Search className="w-5 h-5 text-gray-500" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className={`flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer ${
                selectedDriver?.id === driver.id ? "bg-gray-100" : ""
              }`}
              onClick={() => handleDriverSelect(driver)}
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={driver.avatar} />
                <AvatarFallback>{driver.driver.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{driver.driver.name}</p>
                <p>#{driver.order_number}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const renderChatWindow = () => (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b">
        {isMobileView && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDriver(null)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <Avatar className="w-10 h-10">
          <AvatarImage src={selectedDriver?.avatar} />
          <AvatarFallback>{selectedDriver?.driver.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold">{selectedDriver?.driver.name}</h2>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4 h-[calc(100vh-180px)]">
        {loading && <p className="text-center">Loading messages...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 items-start ${
                msg.sender_type === "user" ? "justify-end" : ""
              }`}
            >
              {msg.sender_type !== "user" && (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={selectedDriver?.avatar} />
                  <AvatarFallback>
                    {selectedDriver?.driver.name[0]}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`rounded-2xl p-3 max-w-[80%] ${
                  msg.sender_type === "user"
                    ? "bg-blue-500 text-white rounded-tr-none"
                    : "bg-gray-100 rounded-tl-none"
                }`}
              >
                <p>{msg.message}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        {/* Message suggestions */}
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion.title)}
              className="bg-gray-100 hover:bg-gray-200 rounded-full text-sm py-1 px-2 transition-colors duration-200"
            >
              {suggestion.title}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Enter a message here"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="rounded-full"
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <Button
            size="icon"
            className="shrink-0 rounded-full bg-black"
            onClick={sendMessage}
            disabled={loading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const orderId = selectedDriver?.order_id;

  // WebSocket Connection
  const { isConnected, error } = useWebSocket({
    channelName: `private-chat.${orderId}`,
    events: [
      {
        event: "NewMessage",
        handler: (data) => {
          console.log("Received message data:", data);
          // Extract the message object from the response
          const message = data.message;

          // Check if it's from the driver
          if (message && message.sender_type === "driver") {
            handleNewMessage(data);
          }
        },
      }
      // Add more event handlers as needed
    ],
  });

  return (
    <div className="flex h-screen bg-white">
      {(!isMobileView || !selectedDriver) && renderDriverList()}
      {(!isMobileView || selectedDriver) &&
        (selectedDriver ? (
          renderChatWindow()
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center">
            <p className="text-gray-500">Select a driver to start chatting</p>
          </div>
        ))}
    </div>
  );
}
