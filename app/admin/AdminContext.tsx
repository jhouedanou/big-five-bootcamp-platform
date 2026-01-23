"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import credentials from "./credentials.json";

// Types
export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  plan: "Free" | "Premium";
  status: "active" | "inactive";
  createdAt: string;
};

export type Content = {
  id: string;
  title: string;
  status: "Publie" | "Brouillon" | "En attente";
  date: string;
  author: string;
  type: "campagne" | "article" | "video";
};

type AdminContextType = {
  users: User[];
  content: Content[];
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: Omit<User, "id" | "createdAt">) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addContent: (item: Omit<Content, "id" | "date">) => void;
  updateContent: (id: string, item: Partial<Content>) => void;
  deleteContent: (id: string) => void;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Sample Data
const initialUsers: User[] = [
  { id: "1", name: "Marie Dupont", email: "marie@example.com", role: "user", plan: "Premium", status: "active", createdAt: "2024-01-15" },
  { id: "2", name: "Jean Martin", email: "jean@example.com", role: "user", plan: "Free", status: "active", createdAt: "2024-02-01" },
  { id: "3", name: "Admin User", email: "admin@bigfive.com", role: "admin", plan: "Premium", status: "active", createdAt: "2023-12-01" },
];

const initialContent: Content[] = [
  { id: "1", title: "Campagne Nike Summer 2024", status: "Publie", date: "2024-03-10", author: "Marie Dupont", type: "campagne" },
  { id: "2", title: "Apple Vision Pro Launch", status: "En attente", date: "2024-03-12", author: "Jean Martin", type: "article" },
  { id: "3", title: "Spotify Wrapped 2024", status: "Publie", date: "2024-03-08", author: "Admin User", type: "video" },
];

export function AdminProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [content, setContent] = useState<Content[]>(initialContent);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedAuth = localStorage.getItem("adminAuth");
    if (storedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const login = (u: string, p: string) => {
    if (u === credentials.username && p === credentials.password) {
      setIsAuthenticated(true);
      localStorage.setItem("adminAuth", "true");
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("adminAuth");
  };

  // User Actions
  const addUser = (userData: Omit<User, "id" | "createdAt">) => {
    const newUser: User = {
      ...userData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString().split("T")[0],
    };
    setUsers([...users, newUser]);
  };

  const updateUser = (id: string, updatedData: Partial<User>) => {
    setUsers(users.map((user) => (user.id === id ? { ...user, ...updatedData } : user)));
  };

  const deleteUser = (id: string) => {
    setUsers(users.filter((user) => user.id !== id));
  };

  // Content Actions
  const addContent = (contentData: Omit<Content, "id" | "date">) => {
    const newContent: Content = {
      ...contentData,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split("T")[0],
    };
    setContent([...content, newContent]);
  };

  const updateContent = (id: string, updatedData: Partial<Content>) => {
    setContent(content.map((item) => (item.id === id ? { ...item, ...updatedData } : item)));
  };

  const deleteContent = (id: string) => {
    setContent(content.filter((item) => item.id !== id));
  };

  return (
    <AdminContext.Provider
      value={{
        users,
        content,
        isAuthenticated,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        addContent,
        updateContent,
        deleteContent,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
