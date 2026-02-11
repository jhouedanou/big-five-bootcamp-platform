"use client";

import React from "react"
import { AdminProvider } from "./AdminContext";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "./AdminContext";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Image from "next/image";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/creatives", label: "Créatives", icon: ImageIcon },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
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
  const { isAuthenticated, isAdmin, isLoading, logout } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/admin/login") {
      router.push("/admin/login");
    }
    if (!isLoading && isAuthenticated && !isAdmin && pathname !== "/admin/login") {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isAdmin, isLoading, pathname, router]);

  if (isLoading) {
    return <div className="min-h-screen bg-secondary flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>;
  }

  // If on login page, render just the children (the login form)
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // If not authenticated or not admin, don't render anything (will redirect)
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Accès refusé</h2>
          <p className="text-white/70 mb-4">Vous devez être administrateur pour accéder à cette page.</p>
          <Button
            onClick={() => router.push("/admin/login")}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Mobile header */}
      <div className="lg:hidden bg-secondary p-4 flex items-center justify-between text-white">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="bg-white/10 p-1 rounded">
            <Image
              src="/logo.png"
              alt="Big Five"
              width={24}
              height={24}
              className="h-6 w-6"
            />
          </div>
          <span className="font-heading text-lg font-bold">Big Five Admin</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-white hover:bg-white/10"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-secondary text-white border-r border-white/10
            transform transition-transform duration-200 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-white/10 hidden lg:block">
              <Link href="/admin" className="flex items-center gap-3">
                <div className="bg-white rounded-lg p-1.5">
                  <Image
                    src="/logo.png"
                    alt="Big Five Creative Library"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-heading text-lg font-bold text-white">Big Five</span>
                  <span className="text-white/60 text-xs">Administration</span>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {sidebarLinks.map((link) => {
                const isActive = pathname.startsWith(link.href) && (link.href === "/admin" ? pathname === "/admin" : true);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                      ${isActive
                        ? "bg-primary text-white shadow-lg"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
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
            <div className="p-4 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Déconnexion</span>
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
        <main className="flex-1 max-w-7xl mx-auto p-4 lg:p-8 min-h-screen w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
