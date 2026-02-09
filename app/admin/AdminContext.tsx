"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { sampleContent } from "@/lib/sample-content";
import type { ContentItem } from "@/components/dashboard/content-card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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

function loadCampaigns(): ContentItem[] {
  if (typeof window === "undefined") return sampleContent;
  const stored = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return sampleContent;
    }
  }
  return sampleContent;
}

function saveCampaigns(campaigns: ContentItem[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
  }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [content, setContent] = useState<Content[]>(initialContent);
  const [campaigns, setCampaigns] = useState<ContentItem[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  const isLoading = status === "loading" || campaignsLoading;
  const isAuthenticated = status === "authenticated";
  const isAdmin = session?.user?.role === "admin";

  // Charger les campagnes depuis Supabase
  useEffect(() => {
    loadCampaignsFromSupabase();
  }, []);

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
      }));

      setCampaigns(formattedCampaigns);
    } catch (error: any) {
      console.error('Error loading campaigns:', error);
      toast.error('Erreur lors du chargement des campagnes');
      // Fallback to sample content
      setCampaigns(sampleContent);
    } finally {
      setCampaignsLoading(false);
    }
  };

  const logout = async () => {
    await signOut({ redirect: false });
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
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: campaignData.title,
          description: campaignData.description,
          brand: campaignData.brand,
          category: campaignData.sector,
          thumbnail: campaignData.imageUrl,
          images: campaignData.images || [],
          video_url: campaignData.videoUrl,
          platforms: [campaignData.platform],
          tags: campaignData.tags,
          status: 'Brouillon',
          author_id: session?.user?.id,
          author_name: session?.user?.name,
        }),
      });

      if (!response.ok) throw new Error('Failed to create campaign');

      const newCampaign = await response.json();
      
      // Recharger les campagnes
      await loadCampaignsFromSupabase();
      toast.success('Campagne créée avec succès');
    } catch (error) {
      console.error('Error adding campaign:', error);
      toast.error('Erreur lors de la création de la campagne');
    }
  };

  const updateCampaign = async (id: string, updatedData: Partial<ContentItem>) => {
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updatedData.title,
          description: updatedData.description,
          brand: updatedData.brand,
          category: updatedData.sector,
          thumbnail: updatedData.imageUrl,
          images: updatedData.images,
          video_url: updatedData.videoUrl,
          platforms: updatedData.platform ? [updatedData.platform] : undefined,
          tags: updatedData.tags,
        }),
      });

      if (!response.ok) throw new Error('Failed to update campaign');

      // Recharger les campagnes
      await loadCampaignsFromSupabase();
      toast.success('Campagne mise à jour avec succès');
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Erreur lors de la mise à jour de la campagne');
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete campaign');

      // Recharger les campagnes
      await loadCampaignsFromSupabase();
      toast.success('Campagne supprimée avec succès');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Erreur lors de la suppression de la campagne');
    }
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
