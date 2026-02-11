"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { ContentItem } from "@/components/dashboard/content-card";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export type { ContentItem };

type AdminContextType = {
  campaigns: ContentItem[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  logout: () => void;
  addCampaign: (item: Omit<ContentItem, "id">) => void;
  updateCampaign: (id: string, item: Partial<ContentItem>) => void;
  deleteCampaign: (id: string) => void;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
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
        country: campaign.country || '',
        sector: campaign.category || '',
        format: campaign.format || '',
        tags: campaign.tags || [],
        date: new Date(campaign.created_at).toISOString().split('T')[0],
        isVideo: !!campaign.video_url,
        images: campaign.images || [],
        videoUrl: campaign.video_url || undefined,
        brand: campaign.brand || '',
        agency: campaign.agency || '',
        year: campaign.year || undefined,
        status: campaign.status || 'Brouillon',
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

  // Mapper ContentItem vers colonnes DB
  const mapToDbRecord = (data: Partial<ContentItem>) => {
    const record: Record<string, any> = {};
    if (data.title !== undefined) record.title = data.title;
    if (data.description !== undefined) record.description = data.description;
    if (data.imageUrl !== undefined) record.thumbnail = data.imageUrl;
    if (data.platform !== undefined) record.platforms = [data.platform];
    if (data.sector !== undefined) record.category = data.sector;
    if (data.videoUrl !== undefined) record.video_url = data.videoUrl || null;
    if (data.country !== undefined) record.country = data.country;
    if (data.format !== undefined) record.format = data.format;
    if (data.agency !== undefined) record.agency = data.agency;
    if (data.year !== undefined) record.year = data.year;
    if (data.images !== undefined) record.images = data.images;
    if (data.tags !== undefined) record.tags = data.tags;
    if (data.brand !== undefined) record.brand = data.brand;
    if (data.status !== undefined) record.status = data.status;
    return record;
  };

  // Campaign Actions
  const addCampaign = async (campaignData: Omit<ContentItem, "id">) => {
    try {
      const record = mapToDbRecord(campaignData);
      if (!record.status) record.status = 'Brouillon';
      const { error } = await supabase.from('campaigns').insert(record);
      if (error) throw error;
      toast.success("Campagne ajoutee avec succes");
      await loadCampaignsFromSupabase();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error("Erreur lors de la creation de la campagne");
    }
  };

  const updateCampaign = async (id: string, updatedData: Partial<ContentItem>) => {
    try {
      const record = mapToDbRecord(updatedData);
      const { error } = await supabase.from('campaigns').update(record).eq('id', id);
      if (error) throw error;
      toast.success("Campagne mise a jour avec succes");
      await loadCampaignsFromSupabase();
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      toast.error("Erreur lors de la mise a jour");
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
      toast.success("Campagne supprimee");
      await loadCampaignsFromSupabase();
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <AdminContext.Provider
      value={{
        campaigns,
        isAuthenticated,
        isAdmin,
        isLoading,
        logout,
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
