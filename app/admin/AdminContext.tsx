"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from "react";
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
  const [isUsingLocalData, setIsUsingLocalData] = useState(false);

  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  // Utiliser useMemo pour éviter de recréer le client à chaque rendu
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // Auth Logic
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session?.user?.email) {
          // D'abord vérifier les métadonnées de l'utilisateur auth
          const userMetadata = session.user.user_metadata;
          if (userMetadata?.role === 'admin') {
            setUserRole('admin');
            setAuthLoading(false);
            return;
          }

          // Ensuite essayer de récupérer le rôle depuis la table users
          try {
            const { data: dbUser, error } = await supabase
              .from('users')
              .select('role')
              .eq('email', session.user.email)
              .single();

            if (error) {
              // Si erreur 500 ou table non existante, utiliser les métadonnées ou fallback
              console.warn("Impossible de récupérer le rôle depuis la table users:", error.message);
              // Vérifier si l'email est un admin connu
              const adminEmails = ['jeanluc@bigfiveabidjan.com', 'cossi@bigfiveabidjan.com', 'yannickj@bigfiveabidjan.com'];
              if (adminEmails.includes(session.user.email)) {
                setUserRole('admin');
              } else {
                setUserRole('user');
              }
            } else if (dbUser) {
              setUserRole(dbUser.role);
            } else {
              setUserRole('user');
            }
          } catch (dbError) {
            console.warn("Erreur DB, utilisation du fallback:", dbError);
            // Fallback sur les emails admin connus
            const adminEmails = ['jeanluc@bigfiveabidjan.com', 'cossi@bigfiveabidjan.com', 'yannickj@bigfiveabidjan.com'];
            if (adminEmails.includes(session.user.email)) {
              setUserRole('admin');
            } else {
              setUserRole('user');
            }
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
        // Vérifier d'abord les métadonnées
        const userMetadata = session.user.user_metadata;
        if (userMetadata?.role === 'admin') {
          setUserRole('admin');
          setAuthLoading(false);
          return;
        }
        
        // Essayer la table users avec gestion d'erreur
        try {
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('role')
            .eq('email', session.user.email)
            .single();
          
          if (error) {
            // Fallback sur les emails admin connus
            const adminEmails = ['jeanluc@bigfiveabidjan.com', 'cossi@bigfiveabidjan.com', 'yannickj@bigfiveabidjan.com'];
            setUserRole(adminEmails.includes(session.user.email) ? 'admin' : 'user');
          } else if (dbUser) {
            setUserRole(dbUser.role);
          }
        } catch {
          const adminEmails = ['jeanluc@bigfiveabidjan.com', 'cossi@bigfiveabidjan.com', 'yannickj@bigfiveabidjan.com'];
          setUserRole(adminEmails.includes(session.user.email) ? 'admin' : 'user');
        }
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

  // Données d'exemple pour l'admin quand la base n'est pas configurée
  const getSampleCampaigns = (): ContentItem[] => [
    {
      id: "sample-1",
      title: "Campagne MTN Mobile Money",
      description: "Campagne digitale pour le lancement de MTN MoMo en Côte d'Ivoire",
      imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800",
      platform: "Facebook",
      country: "Côte d'Ivoire",
      sector: "Telecoms",
      format: "Vidéo",
      tags: ["Mobile Money", "Fintech", "Digital"],
      date: "2024-01-15",
      isVideo: true,
      brand: "MTN",
      agency: "Big Five",
      year: 2024,
      status: "Publié",
    },
    {
      id: "sample-2",
      title: "Lancement Coca-Cola Zero Sugar",
      description: "Campagne 360° pour le nouveau Coca-Cola Zero Sugar",
      imageUrl: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800",
      platform: "Instagram",
      country: "Sénégal",
      sector: "FMCG",
      format: "Image",
      tags: ["Boisson", "Lancement produit"],
      date: "2024-02-20",
      isVideo: false,
      brand: "Coca-Cola",
      agency: "Big Five",
      year: 2024,
      status: "Publié",
    },
    {
      id: "sample-3",
      title: "Orange Bank Africa",
      description: "Campagne de sensibilisation aux services bancaires mobiles",
      imageUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800",
      platform: "YouTube",
      country: "Cameroun",
      sector: "Banque/Finance",
      format: "Vidéo",
      tags: ["Banque mobile", "Digital", "Fintech"],
      date: "2024-03-10",
      isVideo: true,
      brand: "Orange",
      agency: "Big Five",
      year: 2024,
      status: "Brouillon",
    },
  ];

  const loadCampaignsFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table campaigns n'existe pas encore
        console.warn('Table campaigns non disponible:', error.message);
        setCampaigns(getSampleCampaigns());
        setIsUsingLocalData(true);
        return;
      }

      if (!data || data.length === 0) {
        // Pas de campagnes, utiliser des données d'exemple
        setCampaigns(getSampleCampaigns());
        setIsUsingLocalData(true);
        return;
      }

      setIsUsingLocalData(false);

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
      console.warn('Erreur chargement campagnes, utilisation des données exemple:', error?.message || error);
      setCampaigns(getSampleCampaigns());
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
    // Si on utilise des données locales (table non disponible), ajouter localement
    if (isUsingLocalData) {
      const newCampaign: ContentItem = {
        ...campaignData,
        id: `local-${Date.now()}`,
      };
      setCampaigns(prev => [newCampaign, ...prev]);
      toast.success("Campagne ajoutée localement", {
        description: "Note: La base de données n'est pas configurée. Les données seront perdues au rechargement."
      });
      return;
    }

    try {
      const record = mapToDbRecord(campaignData);
      if (!record.status) record.status = 'Brouillon';
      const { error } = await supabase.from('campaigns').insert(record);
      if (error) {
        // Si erreur DB, basculer en mode local
        console.warn('DB non disponible, ajout local:', error.message);
        const newCampaign: ContentItem = {
          ...campaignData,
          id: `local-${Date.now()}`,
        };
        setCampaigns(prev => [newCampaign, ...prev]);
        setIsUsingLocalData(true);
        toast.success("Campagne ajoutée localement", {
          description: "La table 'campaigns' n'existe pas dans Supabase. Exécutez le schéma SQL."
        });
        return;
      }
      toast.success("Campagne ajoutée avec succès");
      await loadCampaignsFromSupabase();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      // Fallback local
      const newCampaign: ContentItem = {
        ...campaignData,
        id: `local-${Date.now()}`,
      };
      setCampaigns(prev => [newCampaign, ...prev]);
      setIsUsingLocalData(true);
      toast.warning("Campagne ajoutée en mode hors-ligne", {
        description: "Configurez Supabase pour persister les données."
      });
    }
  };

  const updateCampaign = async (id: string, updatedData: Partial<ContentItem>) => {
    // Si données locales ou ID local
    if (isUsingLocalData || id.startsWith('local-') || id.startsWith('sample-')) {
      setCampaigns(prev => prev.map(c => 
        c.id === id ? { ...c, ...updatedData } : c
      ));
      toast.success("Campagne mise à jour localement");
      return;
    }

    try {
      const record = mapToDbRecord(updatedData);
      const { error } = await supabase.from('campaigns').update(record).eq('id', id);
      if (error) {
        // Fallback local
        setCampaigns(prev => prev.map(c => 
          c.id === id ? { ...c, ...updatedData } : c
        ));
        toast.success("Campagne mise à jour localement");
        return;
      }
      toast.success("Campagne mise à jour avec succès");
      await loadCampaignsFromSupabase();
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      setCampaigns(prev => prev.map(c => 
        c.id === id ? { ...c, ...updatedData } : c
      ));
      toast.warning("Mise à jour locale uniquement");
    }
  };

  const deleteCampaign = async (id: string) => {
    // Si données locales ou ID local
    if (isUsingLocalData || id.startsWith('local-') || id.startsWith('sample-')) {
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success("Campagne supprimée");
      return;
    }

    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
        toast.success("Campagne supprimée localement");
        return;
      }
      toast.success("Campagne supprimée");
      await loadCampaignsFromSupabase();
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.warning("Suppression locale uniquement");
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
