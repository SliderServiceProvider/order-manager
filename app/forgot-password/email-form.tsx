"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/services/api";

interface EmailFormProps {
  onSuccess: () => void;
}

export default function EmailForm({ onSuccess }: EmailFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Replace with your actual Laravel API endpoint
      await api.post("/forgot-password", { email });
      onSuccess();
    } catch (err) {
      setError("Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
        />
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <Button type="submit" disabled={isLoading} className="text-black">
        {isLoading ? "Sending..." : "Send Reset Link"}
      </Button>
    </form>
  );
}
