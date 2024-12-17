"use client"
import React, { useState } from "react";
import { Bell, User, Settings, LogOut, Mail, Plus, Check, CurlyBracesIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconCubePlus, IconMenuDeep } from "@tabler/icons-react";
// Import the custom hook to access Redux state and dispatch
import { useAppSelector, useAppDispatch } from "@/hooks/useAuth";
import { logout } from "@/store/auth/authSlice";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export function Header({ setSidebarOpen }: HeaderProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const userName = useAppSelector((state) => state.auth.user?.name); // Access user name from Redux state
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = () => {
    setIsOpen(false); // Close the modal when a link is clicked
  };

  // Handle logout by dispatching the logout action and redirecting to the login page
  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("token"); // Remove token from localStorage
    router.push("/"); // Redirect to login or home page
  };

  return (
    <header className="header-wrapper sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <IconMenuDeep className="h-6 w-6" />
          <span className="sr-only">Open sidebar</span>
        </Button>
        {/* <h2 className="text-lg font-semibold lg:hidden uppercase">Slider Enterprise</h2> */}
      </div>
      <div className="flex items-center gap-5">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="flex items-center gap-2 bg-primary p-2 rounded-lg">
            <div className="flex items-center">
              <IconCubePlus className="mr-2" />
            </div>
            Place Order
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-center">
                Select Delivery Type
              </DialogTitle>
              <DialogDescription>
                <div className="grid grid-cols-3 gap-5 py-10">
                  <div>
                    <Link
                      href="/place-order"
                      className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
                      onClick={handleLinkClick}
                    >
                      <img
                        src="/delivery.png"
                        alt="Delivery"
                        className="h-20"
                      />
                      Deliver an Order
                    </Link>
                  </div>
                  <div>
                    <Link
                      href="/place-order/cod"
                      className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
                      onClick={handleLinkClick}
                    >
                      <img src="/cod.png" alt="COD" className="h-20" />
                      Deliver a COD Order
                    </Link>
                  </div>
                  {/* <div>
                    <Link
                      href="/place-order/bulk"
                      className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
                      onClick={handleLinkClick}
                    >
                      <img src="/bulk.png" alt="COD" className="h-20" />
                      Bulk Order
                    </Link>
                  </div> */}
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Mail className="mr-2 h-4 w-4" />
              <span>New message from John Doe</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Plus className="mr-2 h-4 w-4" />
              <span>New order received</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Check className="mr-2 h-4 w-4" />
              <span>Task completed: Update inventory</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> */}

        <div className="flex gap-1">
          <User className="h-5 w-5" />
          <span className="text-sm">{userName}</span>
        </div>

        {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">
              <User className="h-5 w-5" />
              <span className="text-sm">{userName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> */}
      </div>
    </header>
  );
}
