"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { sampleContent } from "@/lib/sample-content";
import type { ContentItem } from "@/components/dashboard/content-card";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

export type { ContentItem };

type AdminContextType = {
  users: User[];
  content: Content[];
  campaigns: ContentItem[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  logout: () => void;
  addUser: (user: Omit<User, "id" | "createdAt">) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addContent: (item: Omit<Content, "id" | "date">) => void;
  updateContent: (id: string, item: Partial<Content>) => void;
  deleteContent: (id: string) => void;
  addCampaign: (item: Omit<ContentItem, "id">) => void;
  updateCampaign: (id: string, item: Partial<ContentItem>) => void;
  deleteCampaign: (id: string) => void;
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

const CAMPAIGNS_STORAGE_KEY = "admin_campaigns";

export function AdminProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [content, setContent] = useState<Content[]>(initialContent);
  const [campaigns, setCampaigns] = useState<ContentItem[]>([]);

  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  const supabase = createClient();
  const router = useRouter();

  // Auth Logic
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session?.user?.email) {
          // Fetch role from DB
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('role')
            .eq('email', session.user.email)
            .single();

          if (dbUser) {
            setUserRole(dbUser.role);
          } else {
            // Fallback if not in DB yet (or mapping issue), check metadata or default
            setUserRole('user');
          }
        }
      } catch (error) {
        console.error("Auth check error", error);
      } finally {
        setAuthLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user?.email) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('role')
          .eq('email', session.user.email)
          .single();
        if (dbUser) setUserRole(dbUser.role);
      } else {
        setUserRole(null);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);


  const isLoading = authLoading || campaignsLoading;
  const isAuthenticated = !!session;
  const isAdmin = userRole === "admin"; // Check role

  // Charger les campagnes depuis Supabase
  useEffect(() => {
    if (isAdmin) {
      loadCampaignsFromSupabase();
    } else {
      setCampaignsLoading(false);
    }
  }, [isAdmin]);

  const loadCampaignsFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convertir les données Supabase au format ContentItem
      const formattedCampaigns: ContentItem[] = (data || []).map((campaign: any) => ({
        id: campaign.id,
        title: campaign.title,
        description: campaign.description || '',
        imageUrl: campaign.thumbnail || '',
        platform: campaign.platforms?.[0] || 'Facebook',
        country: 'Côte d\'Ivoire',
        sector: campaign.category || 'Marketing',
        format: campaign.video_url ? 'Video' : 'Image',
        tags: campaign.tags || [],
        date: new Date(campaign.created_at).toISOString().split('T')[0],
        isVideo: !!campaign.video_url,
        images: campaign.images || [],
        videoUrl: campaign.video_url || undefined,
        brand: campaign.brand || '',
        status: campaign.status || 'Publié',
      }));

      setCampaigns(formattedCampaigns);
    } catch (error: any) {
      console.error('Error loading campaigns:', error);
      // toast.error('Erreur lors du chargement des campagnes');
      setCampaigns([]);
    } finally {
      setCampaignsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
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

  // Campaign Actions
  const addCampaign = async (campaignData: Omit<ContentItem, "id">) => {
    // TODO: Implement Supabase Insert
    toast.info("Fonctionnalité en cours de migration Supabase");
  };

  const updateCampaign = async (id: string, updatedData: Partial<ContentItem>) => {
    // TODO: Implement Supabase Update
    toast.info("Fonctionnalité en cours de migration Supabase");
  };

  const deleteCampaign = async (id: string) => {
    // TODO: Implement Supabase Delete
    toast.info("Fonctionnalité en cours de migration Supabase");
  };

  return (
    <AdminContext.Provider
      value={{
        users,
        content,
        campaigns,
        isAuthenticated,
        isAdmin,
        isLoading,
        logout,
        addUser,
        updateUser,
        deleteUser,
        addContent,
        updateContent,
        deleteContent,
        addCampaign,
        updateCampaign,
        deleteCampaign,
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
