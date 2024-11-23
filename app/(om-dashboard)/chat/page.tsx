"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: number;
  user: string;
  content: string;
  timestamp: string;
}

export default function ChatRoom() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState(
    "User" + Math.floor(Math.random() * 1000)
  );
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(
        "http://your-laravel-api.com/api/messages"
      );
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await axios.post("http://your-laravel-api.com/api/messages", {
        user: username,
        content: newMessage,
      });
      setNewMessage("");
      fetchMessages(); // Fetch messages again to include the new one
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Chat Room</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea
          className="h-[400px] mb-4 p-4 border rounded-md"
          ref={scrollAreaRef}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-2 ${
                message.user === username ? "text-right" : ""
              }`}
            >
              <span className="font-bold">{message.user}: </span>
              <span>{message.content}</span>
            </div>
          ))}
        </ScrollArea>
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow"
          />
          <Button type="submit">Send</Button>
        </form>
      </CardContent>
    </Card>
  );
}
