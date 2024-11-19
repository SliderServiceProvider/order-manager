"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/theme/Header";
import { Sidebar } from "@/components/theme/Sidebar";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const isAuthenticated = useAuth();

  React.useEffect(() => {
    // Add a small delay to allow hydration and localStorage check
    const timer = setTimeout(() => {
      setIsLoading(false);
      if (!isAuthenticated) {
        router.push("/");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Return null while redirecting
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="flex-1 lg:pl-64 bg-gray-50">
        <Header setSidebarOpen={setSidebarOpen} />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
