"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  LayoutDashboard,
  User,
  PackageCheck,
  Cpu,
  X,
  MapPinHouse,
  ChartNoAxesCombined,
  MessageSquareWarning,
  UserCog2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  IconBuilding,
  IconGps,
  IconHelpCircle,
  IconInbox,
  IconMessage,
  IconPackage,
  IconReceipt,
  IconUserBolt,
  IconUserCog,
  IconWallet,
} from "@tabler/icons-react";

// Import the custom hook to access Redux state and dispatch
import { useAppSelector, useAppDispatch } from "@/hooks/useAuth";
import { logout } from "@/store/auth/authSlice";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { log } from "node:console";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  items?: NavItem[];
}

const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Order",
    href: "/orders",
    icon: IconPackage,
  },
  {
    title: "My Balance",
    href: "/my-balance",
    icon: IconPackage,
  },
  // {
  //   title: "Track Order",
  //   href: process.env.NEXT_PUBLIC_BACKEND_URL + "/track-order/2070/23592297",
  //   icon: IconGps,
  // },
  {
    title: "Address Book",
    href: "/addresses",
    icon: MapPinHouse,
  },

  {
    title: "Invoice List",
    href: "/invoices",
    icon: IconReceipt,
  },
  {
    title: "Payouts",
    href: "/payouts",
    icon: IconWallet,
  },
  {
    title: "Chat",
    href: "/chat",
    icon: IconMessage,
  },
  {
    title: "Account Settings",
    href: "/account-settings",
    icon: UserCog2,
  },
];

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const isShowInvoices = useAppSelector(
    (state) => state.auth.user?.isShowInvoices
  ); // Access isInvoiceUser from Redux state

  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const router = useRouter();

  const isActiveSc = pathname.startsWith("/support-center"); // Updated logic
  // Filter navigation items based on isInvoiceUser
  const filteredNavigation = React.useMemo(
    () =>
      navigation.filter(
        (item) => !(item.title === "Invoice List" && !isShowInvoices)
      ),
    [isShowInvoices]
  );

  // Handle logout by dispatching the logout action and redirecting to the login page
  const handleLogout = () => {
    dispatch(logout());
    router.push("/"); // Redirect to login or home page
  };

  return (
    <>
      <aside
        className={cn(
          "flex flex-col justify-between sidebar-wrapper fixed inset-y-0 left-0 z-50 w-64 -translate-x-full transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen && "translate-x-0"
        )}
      >
        <div className="menu-block">
          <div className="logo-wrapper flex h-16 items-center justify-between">
            <h1 className="text-xl font-semibold text-white uppercase">
              Slider Enterprise
            </h1>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
              <span className="sr-only">Close sidebar</span>
            </Button>
          </div>
          <nav className="sidebar-menu space-y-1 px-2 py-4">
            {filteredNavigation.map((item, index) => (
              <NavGroup key={index} item={item} pathname={pathname} />
            ))}
          </nav>
        </div>

        <div className="p-2">
          <div className="sidebar-menu mb-4">
            <Link
              href="/order-support"
              className={`text-gray-400 text-[14px] font-medium flex items-center gap-2 menu-item rounded-md px-2 py-2 ${
                isActiveSc && "active"
              }`}
            >
              <IconHelpCircle size={16} />Order Support
            </Link>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full bg-gray-800 text-white">Logout</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Logout</DialogTitle>
              </DialogHeader>
              <p>Are you sure you want to log out?</p>
              <DialogFooter>
                <Button variant="ghost" asChild>
                  <DialogClose>Cancel</DialogClose>
                </Button>
                <Button onClick={handleLogout} className="bg-red-600">
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </aside>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}

function NavGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasItems = item.items && item.items.length > 0;
  const contentRef = React.useRef<HTMLDivElement>(null);
  const isActive = pathname.startsWith(item.href || ""); // Updated logic

  return (
    <div className="flex flex-col">
      <Button
        variant="ghost"
        className={cn(
          "menu-item flex w-full items-center justify-between px-3 py-2 text-sm font-medium",
          hasItems ? "cursor-pointer" : "",
          isActive && "active" // This will now apply for both the main and subpaths
        )}
        onClick={() => hasItems && setIsOpen(!isOpen)}
        asChild={!hasItems}
      >
        {!hasItems ? (
          <Link href={item.href || "#"} className="flex w-full items-center">
            <item.icon className="mr-2 h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        ) : (
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center">
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-90"
              )}
            />
          </div>
        )}
      </Button>
      {hasItems && (
        <div
          ref={contentRef}
          className={cn(
            "overflow-hidden transition-all duration-200 ease-in-out",
            isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
          )}
          style={{
            maxHeight: isOpen ? `${contentRef.current?.scrollHeight}px` : "0px",
          }}
        >
          <div className="flex flex-col space-y-1 px-2 py-1.5">
            {item.items?.map((subItem, index) => (
              <Button
                key={index}
                variant="ghost"
                asChild
                className={cn(
                  "menu-item justify-start pl-8 text-sm font-normal",
                  pathname.startsWith(subItem.href || "") &&
                    "bg-accent text-accent-foreground"
                )}
              >
                <Link href={subItem.href || "#"} className="flex items-center">
                  <subItem.icon className="mr-2 h-4 w-4" />
                  <span>{subItem.title}</span>
                </Link>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
