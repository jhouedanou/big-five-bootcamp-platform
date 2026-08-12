"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useRef } from "react";
import type { ContentItem } from "@/components/dashboard/content-card";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { invalidateTempsFortsCache } from "@/components/temps-forts/use-temps-forts";

export type { ContentItem };

type AdminContextType = {
  campaigns: ContentItem[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  isUsingLocalData: boolean;
  userEmail: string | null;
  logout: () => void;
  /** Résout à `true` si la campagne a bien été persistée en base. */
  addCampaign: (item: Omit<ContentItem, "id">) => Promise<boolean>;
  updateCampaign: (id: string, item: Partial<ContentItem>) => Promise<boolean>;
  deleteCampaign: (id: string) => Promise<boolean>;
  refreshCampaigns: () => Promise<void>;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

/**
 * Mode démonstration : jeu de campagnes factices en mémoire, pour travailler
 * l'UI sans base. Opt-in explicite — il ne doit JAMAIS s'activer tout seul.
 *
 * Historique : ce mode se déclenchait sur n'importe quel échec d'appel API
 * (401 de session expirée compris), affichait des toasts de succès et laissait
 * croire que les campagnes étaient enregistrées alors que rien ne partait en
 * base. C'est ce qui a bloqué l'ajout de campagnes vidéo.
 */
const DEMO_MODE = process.env.NEXT_PUBLIC_ADMIN_DEMO === "true";

/** Code Postgres « undefined_table » — le seul cas où « table absente » est vrai. */
const PG_UNDEFINED_TABLE = "42P01";

function isMissingTable(result: any): boolean {
  if (!result) return false;
  if (result.code === PG_UNDEFINED_TABLE) return true;
  return (
    typeof result.error === "string" &&
    /relation .* does not exist/i.test(result.error)
  );
}

/**
 * Traduit un échec d'appel à /api/admin/campaigns en message affichable.
 * Chaque cause a son message : c'est ce qui manquait pour diagnostiquer.
 */
function describeFailure(
  status: number,
  result: any
): { title: string; description: string } {
  if (status === 401) {
    return {
      title: "Session expirée",
      description:
        "Reconnectez-vous : vos modifications n'ont pas été enregistrées.",
    };
  }
  if (isMissingTable(result)) {
    return {
      title: "Table « campaigns » introuvable",
      description: "Exécutez les migrations Supabase (voir migrations.md).",
    };
  }
  return {
    title: "Enregistrement échoué",
    description: result?.error || `Erreur serveur (HTTP ${status}).`,
  };
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<ContentItem[]>([]);
  const [isUsingLocalData, setIsUsingLocalData] = useState(false);

  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const initialCheckDone = useRef(false);
  const knownUserIdRef = useRef<string | null>(null);

  // Utiliser useMemo pour éviter de recréer le client à chaque rendu
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // Auth Logic
  useEffect(() => {
    let cancelled = false;

    const checkUser = async () => {
      try {
        // getUser() valide le token côté serveur (fiable après refresh)
        // Pas de getSession() — INITIAL_SESSION de onAuthStateChange suffit
        // si on a besoin du token. On n'expose ici que email / role / id.
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (user?.email) {
          setAuthEmail(user.email);
          setAuthUserId(user.id);
          knownUserIdRef.current = user.id;
        }

        if (user?.email) {
          // Vérifier app_metadata (rôle sécurisé, non modifiable par l'utilisateur).
          // NE PAS lire user_metadata ici : il est modifiable côté client via
          // supabase.auth.updateUser({ data }) et n'est pas une source de confiance.
          const appMetadata = user.app_metadata;
          if (appMetadata?.role === 'admin') {
            setUserRole('admin');
            setAuthLoading(false);
            return;
          }

          // Liste des emails admin autorisés (fallback principal)
          const adminEmails = ['jeanluc@bigfiveabidjan.com', 'cossi@bigfiveabidjan.com', 'yannick@bigfiveabidjan.com', 'franck@bigfiveabidjan.com', 'stephanie@bigfiveabidjan.com'];

          // Vérifier d'abord si l'email est dans la liste admin connue
          if (adminEmails.includes(user.email)) {
            setUserRole('admin');
            setAuthLoading(false);
            return;
          }

          // Ensuite essayer de récupérer le rôle depuis la table users (optionnel)
          try {
            const { data: dbUser, error } = await supabase
              .from('users')
              .select('role')
              .eq('email', user.email)
              .maybeSingle();

            if (cancelled) return;
            if (!error && dbUser?.role) {
              setUserRole(dbUser.role);
            } else {
              setUserRole('user');
            }
          } catch (dbError) {
            if (cancelled) return;
            console.warn("Erreur DB, utilisation du fallback:", dbError);
            setUserRole('user');
          }
        }
      } catch (error: any) {
        // Ignorer les AbortError causés par le démontage du composant (React Strict Mode)
        if (error?.name === 'AbortError' || (error instanceof DOMException && error.name === 'AbortError')) {
          return;
        }
        if (!cancelled) {
          console.error("Auth check error", error);
        }
      } finally {
        if (!cancelled) {
          initialCheckDone.current = true;
          setAuthLoading(false);
        }
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      // Ignorer les events tant que getUser() n'a pas fini
      if (!initialCheckDone.current) return;
      // TOKEN_REFRESHED fire à chaque refresh (≈ 1h) — pas besoin de re-checker
      // le rôle si le user n'a pas changé. Évite N requêtes DB par session.
      if (event === "TOKEN_REFRESHED" && session?.user?.id === knownUserIdRef.current) return;
      if (session?.user?.email) {
        setAuthEmail(session.user.email);
        setAuthUserId(session.user.id);
        knownUserIdRef.current = session.user.id;
      } else {
        setAuthEmail(null);
        setAuthUserId(null);
        knownUserIdRef.current = null;
      }
      if (session?.user?.email) {
        // Vérifier app_metadata (rôle sécurisé, non modifiable par l'utilisateur).
        const appMetadata = session.user.app_metadata;
        if (appMetadata?.role === 'admin') {
          setUserRole('admin');
          setAuthLoading(false);
          return;
        }
        
        // Liste des emails admin autorisés
        const adminEmails = ['jeanluc@bigfiveabidjan.com', 'cossi@bigfiveabidjan.com', 'yannick@bigfiveabidjan.com', 'franck@bigfiveabidjan.com', 'stephanie@bigfiveabidjan.com'];
        
        // Vérifier si l'email est dans la liste admin connue
        if (adminEmails.includes(session.user.email)) {
          setUserRole('admin');
          setAuthLoading(false);
          return;
        }
        
        // Essayer la table users avec gestion d'erreur (optionnel)
        try {
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('role')
            .eq('email', session.user.email)
            .maybeSingle();
          
          if (!error && dbUser?.role) {
            setUserRole(dbUser.role);
          } else {
            setUserRole('user');
          }
        } catch {
          setUserRole('user');
        }
      } else {
        setUserRole(null);
      }
      setAuthLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);


  const isLoading = authLoading || campaignsLoading;
  const isAuthenticated = !!authEmail;
  const isAdmin = userRole === "admin"; // Check role

  // Charger les campagnes depuis Supabase
  useEffect(() => {
    if (isAdmin && !authLoading) {
      // Petit délai pour s'assurer que les cookies sont synchronisés
      const timer = setTimeout(() => {
        loadCampaignsFromSupabase();
      }, 100);
      return () => clearTimeout(timer);
    } else if (!authLoading) {
      setCampaignsLoading(false);
    }
  }, [isAdmin, authLoading]);

  // Données d'exemple pour l'admin quand la base n'est pas configurée.
  // Une publication vidéo par plateforme pour tester la modale + récupération
  // thumbnail. imageUrl vide volontairement → tester le bouton "Récupérer thumbnail".
  const getSampleCampaigns = (): ContentItem[] => [
    {
      id: "sample-youtube",
      title: "Orange Bank Africa — Spot YouTube",
      description: "Spot publicitaire YouTube pour les services bancaires mobiles",
      imageUrl: "",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      platform: "YouTube",
      platforms: ["YouTube"],
      country: "Togo",
      sector: "Banque/Finance",
      format: "Vidéo",
      tags: ["Banque mobile", "Digital"],
      date: "2024-03-10",
      isVideo: true,
      brand: "Orange",
      agency: "Laveiye",
      year: 2024,
      status: "Publié",
    },
    {
      id: "sample-facebook",
      title: "MTN Mobile Money — Vidéo Facebook",
      description: "Campagne vidéo Facebook pour le lancement de MTN MoMo",
      imageUrl: "",
      videoUrl: "https://www.facebook.com/watch/?v=10153231379946729",
      platform: "Facebook",
      platforms: ["Facebook"],
      country: "Côte d'Ivoire",
      sector: "Telecoms",
      format: "Vidéo",
      tags: ["Mobile Money", "Fintech"],
      date: "2024-01-15",
      isVideo: true,
      brand: "MTN",
      agency: "Laveiye",
      year: 2024,
      status: "Publié",
    },
    {
      id: "sample-instagram",
      title: "Coca-Cola Zero — Reel Instagram",
      description: "Reel Instagram pour le lancement de Coca-Cola Zero Sugar",
      imageUrl: "",
      videoUrl: "https://www.instagram.com/reel/C8Qh1VStq0r/",
      platform: "Instagram",
      platforms: ["Instagram"],
      country: "Sénégal",
      sector: "FMCG",
      format: "Reel",
      tags: ["Boisson", "Lancement produit"],
      date: "2024-02-20",
      isVideo: true,
      brand: "Coca-Cola",
      agency: "Laveiye",
      year: 2024,
      status: "Publié",
    },
    {
      id: "sample-tiktok",
      title: "Maggi — Challenge TikTok",
      description: "Challenge TikTok culinaire autour de la marque Maggi",
      imageUrl: "",
      videoUrl: "https://www.tiktok.com/@tiktok/video/7106594312292453675",
      platform: "TikTok",
      platforms: ["TikTok"],
      country: "Côte d'Ivoire",
      sector: "FMCG",
      format: "Vidéo",
      tags: ["Challenge", "UGC"],
      date: "2024-04-05",
      isVideo: true,
      brand: "Maggi",
      agency: "Laveiye",
      year: 2024,
      status: "Publié",
    },
    {
      id: "sample-linkedin",
      title: "Ecobank — Vidéo LinkedIn",
      description: "Communication corporate LinkedIn sur la transformation digitale",
      imageUrl: "",
      videoUrl: "https://www.linkedin.com/feed/update/urn:li:activity:7000000000000000000",
      platform: "LinkedIn",
      platforms: ["LinkedIn"],
      country: "Togo",
      sector: "Banque/Finance",
      format: "Vidéo",
      tags: ["Corporate", "B2B"],
      date: "2024-05-12",
      isVideo: true,
      brand: "Ecobank",
      agency: "Laveiye",
      year: 2024,
      status: "Publié",
    },
    {
      id: "sample-twitter",
      title: "Wave — Vidéo X (Twitter)",
      description: "Vidéo X/Twitter pour la promotion des transferts sans frais",
      imageUrl: "",
      videoUrl: "https://x.com/X/status/1780609153315426788",
      platform: "Twitter/X",
      platforms: ["Twitter/X"],
      country: "Sénégal",
      sector: "Telecoms",
      format: "Vidéo",
      tags: ["Fintech", "Promotion"],
      date: "2024-06-01",
      isVideo: true,
      brand: "Wave",
      agency: "Laveiye",
      year: 2024,
      status: "Publié",
    },
  ];

  const loadCampaignsFromSupabase = async () => {
    try {
      console.log('Loading campaigns from API...')
      
      // Utiliser l'API admin qui bypass RLS
      const response = await fetch('/api/admin/campaigns', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('API response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return handleLoadFailure(response.status, errorData);
      }

      const { campaigns: data, error, code } = await response.json();

      if (error) {
        return handleLoadFailure(500, { error, code });
      }

      if (!data || data.length === 0) {
        // Table présente mais vide : c'est un état normal, pas une panne.
        setCampaigns([]);
        setIsUsingLocalData(false);
        return;
      }

      setIsUsingLocalData(false);

      // Convertir les données Supabase au format ContentItem
      const formattedCampaigns: ContentItem[] = (data || []).map((campaign: any) => ({
        id: campaign.id,
        title: campaign.title,
        summary: campaign.summary || '',
        description: campaign.description || '',
        imageUrl: campaign.thumbnail || '',
        platform: campaign.platforms?.[0] || 'Facebook',
        platforms: campaign.platforms || [],
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
        axe: campaign.axe || [],
        analyse: campaign.analyse || '',
        howToUse: campaign.how_to_use || '',
        year: campaign.year || undefined,
        status: campaign.status || 'Brouillon',
        accessLevel: campaign.access_level || 'free',
        slug: campaign.slug || '',
        featured: campaign.featured || false,
        publicationUrl: campaign.publication_url || '',
        tempsFortSlugs: campaign.temps_fort_slugs || [],
      }));

      setCampaigns(formattedCampaigns);
    } catch (error: any) {
      console.error('Erreur réseau chargement campagnes:', error?.message || error);
      setCampaigns([]);
      setIsUsingLocalData(false);
      toast.error("Impossible de charger les campagnes", {
        description: "Vérifiez votre connexion, puis rechargez la page.",
      });
    } finally {
      setCampaignsLoading(false);
    }
  };

  /**
   * Échec de chargement. On n'affiche jamais de données factices à la place des
   * vraies : une liste vide + une erreur explicite valent mieux qu'un catalogue
   * fictif sur lequel l'admin croirait travailler.
   */
  const handleLoadFailure = (status: number, result: any) => {
    const { title, description } = describeFailure(status, result);
    console.warn('Chargement campagnes échoué:', status, result?.error);

    // Seul cas où le mode démo est légitime : opt-in explicite ET table absente.
    if (DEMO_MODE && isMissingTable(result)) {
      setCampaigns(getSampleCampaigns());
      setIsUsingLocalData(true);
      toast.warning("Mode démonstration", {
        description: "Table absente : campagnes d'exemple, rien n'est persisté.",
      });
      return;
    }

    setCampaigns([]);
    setIsUsingLocalData(false);
    toast.error(title, { description });
  };

  const logout = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    router.push("/admin/login");
  };

  // Mapper ContentItem vers colonnes DB
  const mapToDbRecord = (data: Partial<ContentItem>) => {
    const record: Record<string, any> = {};
    if (data.title !== undefined) record.title = data.title;
    if (data.summary !== undefined) record.summary = data.summary;
    if (data.description !== undefined) record.description = data.description;
    if (data.imageUrl !== undefined) record.thumbnail = data.imageUrl;
    if (data.platform !== undefined) record.platforms = data.platform ? [data.platform] : [];
    if (data.sector !== undefined) record.category = data.sector;
    if (data.videoUrl !== undefined) record.video_url = data.videoUrl || null;
    if (data.country !== undefined) record.country = data.country;
    if (data.format !== undefined) record.format = data.format;
    if (data.agency !== undefined) record.agency = data.agency;
    if (data.year !== undefined) record.year = data.year;
    if (data.images !== undefined) record.images = data.images;
    if (data.tags !== undefined) record.tags = data.tags;
    if (data.brand !== undefined) record.brand = data.brand;
    if (data.axe !== undefined) record.axe = data.axe;
    if (data.analyse !== undefined) record.analyse = data.analyse;
    if (data.howToUse !== undefined) record.how_to_use = data.howToUse;
    if (data.status !== undefined) record.status = data.status;
    if (data.accessLevel !== undefined) record.access_level = data.accessLevel;
    if (data.slug !== undefined) record.slug = data.slug;
    if (data.featured !== undefined) record.featured = data.featured;
    if (data.publicationUrl !== undefined) record.publication_url = data.publicationUrl || null;
    if (data.tempsFortSlugs !== undefined) record.temps_fort_slugs = data.tempsFortSlugs;
    return record;
  };

  // Campaign Actions
  //
  // Règle commune aux trois mutations : en cas d'échec, on remonte `false` et un
  // toast d'erreur. Aucune écriture locale de secours, aucun toast de succès —
  // l'admin doit voir immédiatement que rien n'a été enregistré.
  const addCampaign = async (campaignData: Omit<ContentItem, "id">): Promise<boolean> => {
    // Mode démo (opt-in) : ajout en mémoire, annoncé comme tel.
    if (isUsingLocalData) {
      const newCampaign: ContentItem = {
        ...campaignData,
        id: `local-${Date.now()}`,
      };
      setCampaigns(prev => [newCampaign, ...prev]);
      invalidateTempsFortsCache();
      toast.warning("Ajoutée en mode démonstration", {
        description: "Non enregistrée : les données seront perdues au rechargement.",
      });
      return true;
    }

    try {
      const record = mapToDbRecord(campaignData);
      if (!record.status) record.status = 'Brouillon';

      const response = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(record),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.error) {
        const { title, description } = describeFailure(response.status, result);
        console.error('Création campagne échouée:', response.status, result?.error);
        toast.error(title, { description });
        return false;
      }

      toast.success("Campagne ajoutée avec succès");
      await loadCampaignsFromSupabase();
      invalidateTempsFortsCache();
      return true;
    } catch (error: any) {
      console.error('Erreur réseau création campagne:', error);
      toast.error("Enregistrement échoué", {
        description: "Erreur réseau — la campagne n'a pas été créée. Réessayez.",
      });
      return false;
    }
  };

  const updateCampaign = async (
    id: string,
    updatedData: Partial<ContentItem>
  ): Promise<boolean> => {
    // Mode démo, ou ligne qui n'existe que côté client.
    if (isUsingLocalData || id.startsWith('local-') || id.startsWith('sample-')) {
      setCampaigns(prev => prev.map(c =>
        c.id === id ? { ...c, ...updatedData } : c
      ));
      invalidateTempsFortsCache();
      toast.warning("Mise à jour en mode démonstration", {
        description: "Non enregistrée en base.",
      });
      return true;
    }

    try {
      const record = mapToDbRecord(updatedData);

      const response = await fetch('/api/admin/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, ...record }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.error) {
        const { title, description } = describeFailure(response.status, result);
        console.error('Mise à jour campagne échouée:', response.status, result?.error);
        toast.error(title, { description });
        return false;
      }

      toast.success("Campagne mise à jour avec succès");
      await loadCampaignsFromSupabase();
      invalidateTempsFortsCache();
      return true;
    } catch (error: any) {
      console.error('Erreur réseau mise à jour campagne:', error);
      toast.error("Mise à jour échouée", {
        description: "Erreur réseau — aucune modification enregistrée. Réessayez.",
      });
      return false;
    }
  };

  const deleteCampaign = async (id: string): Promise<boolean> => {
    // Mode démo, ou ligne qui n'existe que côté client.
    if (isUsingLocalData || id.startsWith('local-') || id.startsWith('sample-')) {
      setCampaigns(prev => prev.filter(c => c.id !== id));
      invalidateTempsFortsCache();
      return true;
    }

    try {
      const response = await fetch(`/api/admin/campaigns?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.error) {
        const { title, description } = describeFailure(response.status, result);
        console.error('Suppression campagne échouée:', response.status, result?.error);
        // Ne PAS retirer la ligne de la liste : elle est toujours en base.
        toast.error(title, { description });
        return false;
      }

      toast.success("Campagne supprimée");
      await loadCampaignsFromSupabase();
      invalidateTempsFortsCache();
      return true;
    } catch (error: any) {
      console.error('Erreur réseau suppression campagne:', error);
      toast.error("Suppression échouée", {
        description: "Erreur réseau — la campagne est toujours en base. Réessayez.",
      });
      return false;
    }
  };

  return (
    <AdminContext.Provider
      value={{
        campaigns,
        isAuthenticated,
        isAdmin,
        isLoading,
        isUsingLocalData,
        userEmail: authEmail,
        logout,
        addCampaign,
        updateCampaign,
        deleteCampaign,
        refreshCampaigns: loadCampaignsFromSupabase,
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
