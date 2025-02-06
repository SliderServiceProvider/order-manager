"use client";

import { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MoreVertical, Search, Send, ArrowLeft } from "lucide-react";
import api from "@/services/api";
import {
  initializeWebSocket,
  subscribeToChannel,
  leaveChannel,
} from "@/utils/websocket";
import { useWebSocket } from "@/hooks/useWebSocket";

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

interface PageProps {
  params: {
    order_number: string;
  };
}

const Page: React.FC<PageProps> = ({ params }) => {
  const { order_number } = params;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<ChatIndex | null>(null);
  const [drivers, setDrivers] = useState<ChatIndex[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestions[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);

  const fetchDrivers = useCallback(async () => {
    try {
      const response = await api.get(
        `/order-manager/chat/getChatIndex/${order_number}`
      );
      const responseData = response.data;
      setDrivers(responseData.chatList);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      setError("Failed to fetch drivers. Please try again.");
    }
  }, [order_number]);

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
      setError(null);
      try {
        const response = await api.get(
          `/order-manager/chat/messages?order_number=${orderNumber}`
        );
        setMessages(response.data.chat);
        setSuggestions(response.data.messageSuggestions);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setError("Failed to fetch messages. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const sendMessage = async () => {
    if (!selectedDriver || !message.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await api.post("/chat/send-message", {
        order_id: selectedDriver.order_id,
        message: message,
        receiver_id: selectedDriver.driver.id,
      });
      // The new message will be added through the WebSocket event
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDriverSelect = (driver: ChatIndex) => {
    setSelectedDriver(driver);
    fetchMessages(driver.id, driver.order_number);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };

  useEffect(() => {
    // Fetch drivers on component mount
    const fetchDriversAndSelectDefault = async () => {
      try {
        const response = await api.get("/order-manager/chat/getChatIndex");
        const responseData = response.data;
        setDrivers(responseData.chatList);

        // Automatically select the driver for the given order_number
        const defaultDriver = responseData.chatList.find(
          (driver: ChatIndex) =>
            driver.order_number === Number.parseInt(order_number)
        );

        if (defaultDriver) {
          setSelectedDriver(defaultDriver);
          fetchMessages(defaultDriver.id, defaultDriver.order_number);
        }
      } catch (error) {
        console.error("Error fetching drivers:", error);
        setError("Failed to fetch drivers. Please try again.");
      }
    };

    fetchDriversAndSelectDefault();

    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [order_number, fetchMessages]);

  // useEffect(() => {
  //   initializeWebSocket();

  //   return () => {
  //     if (selectedDriver) {
  //       leaveChannel(`chat.${selectedDriver.order_id}`);
  //     }
  //   };
  // }, [selectedDriver]);
  // useEffect(() => {
  //   console.log("🟢 Calling initializeWebSocket...");
  //   // initializeWebSocket();
  // }, []);

  const renderDriverList = () => (
    <div className="w-full md:w-80 border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Drivers00</h1>
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

      <ScrollArea className="flex-1 p-4">
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

  const isConnected = useWebSocket(
    `chat.${selectedDriver?.order_id}`,
    "MessageSent"
  );

  useEffect(() => {
    if (isConnected && selectedDriver) {
      console.log("websocket is connected");

      const handleNewMessage = (data: { message: Message }) => {
        setMessages((prevMessages) => [...prevMessages, data.message]);
      };

      subscribeToChannel(
        `chat.${selectedDriver.order_id}`,
        "MessageSent",
        handleNewMessage
      );

      return () => {
        leaveChannel(`chat.${selectedDriver.order_id}`); //
      };
    }
  }, [isConnected, selectedDriver]);

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
};

export default Page;
