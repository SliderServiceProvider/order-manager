"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/store/auth/authSlice"; // Redux action to set auth
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        "/auth/login",
        { email, password,"device":"web" }
        // { withCredentials: true }
      );

      const { user, token } = response.data;

      // Store the token in localStorage or cookie for persistence
      localStorage.setItem("token", token);

      // Dispatch to set auth state
      dispatch(setCredentials({ user, token }));
      router.push("/dashboard");
    } catch (err: any) {
      setIsLoading(false);
      const errorMessage =
        err.response?.data?.message || "Invalid email or password.";
      toast({
        variant: "destructive",
        title: "Login failed",
        description: errorMessage || "Invalid email or password",
      });
      setError("Invalid email or password");
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-amber-400"
      style={{
        backgroundImage: 'url("/hero-pattern.png")',
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="w-full max-w-md space-y-12 rounded-2xl shadow p-6 bg-white">
        <div>
          <Image
            src="/slider_logo.png"
            className="-ml-4"
            width={140}
            height={0}
            alt="slider-logo"
          />
        </div>
        <div className="text-left">
          <h1 className="text-2xl font-bold">Welcome back!</h1>
          <p className="text-sm text-gray-600">
            Please enter your credentials to sign in!
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 border-none bg-gray-100 rounded-xl h-12"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 border-none bg-gray-100 rounded-xl h-12"
            />
          </div>
          <div className="mt-4">
            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-black"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Log in"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
