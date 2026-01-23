"use client";

import React from "react"
import { AdminProvider } from "./AdminContext";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "./AdminContext";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Image from "next/image";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/content", label: "Contenus", icon: FolderOpen },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/settings", label: "Parametres", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminProvider>
  );
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    // Small delay to allow context to load from localStorage
    const timer = setTimeout(() => {
      setIsLoading(false);
      if (!isAuthenticated && pathname !== "/admin/login") {
        router.push("/admin/login");
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, pathname, router]);

  if (isLoading) {
    return <div className="min-h-screen bg-[#0A1F44] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>;
  }

  // If on login page, render just the children (the login form)
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // If not authenticated and not on login page, don't render anything (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A1F44]">
      {/* Mobile header */}
      <div className="lg:hidden bg-[#071428] border-b border-[#1a3a6e] p-4 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Big Five Bootcamp"
            width={32}
            height={32}
            className="h-8 w-8"
            priority
          />
          <span className="font-[family-name:var(--font-heading)] text-lg font-bold text-white">Big Five</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-white hover:bg-[#1a3a6e]"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-[#071428] border-r border-[#1a3a6e]
            transform transition-transform duration-200 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-[#1a3a6e] hidden lg:block">
              <Link href="/admin" className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="Big Five Bootcamp"
                  width={40}
                  height={40}
                  className="h-10 w-10"
                  priority
                />
                <div className="flex flex-col">
                  <span className="font-[family-name:var(--font-heading)] text-lg font-bold text-white">Big Five</span>
                  <span className="text-[#9CA3AF] text-xs">Back-office</span>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {sidebarLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                      ${
                        isActive
                          ? "bg-[#FF6B35] text-white"
                          : "text-[#9CA3AF] hover:bg-[#1a3a6e] hover:text-white"
                      }
                    `}
                  >
                    <link.icon className="h-5 w-5" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[#1a3a6e]">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#9CA3AF] hover:bg-[#1a3a6e] hover:text-white transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Deconnexion</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-h-screen">{children}</main>
      </div>
    </div>
  );
}
