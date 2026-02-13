'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSupabaseAuth } from './use-supabase-auth'

interface Favorite {
  id: string
  campaign_id: string
  created_at: string
}

interface FavoriteWithCampaign extends Favorite {
  campaign?: {
    id: string
    title: string
    thumbnail: string
    platforms: string[]
    category: string
    format: string
    description: string
    video_url?: string
  }
}

export function useFavorites() {
  const { user, loading: authLoading } = useSupabaseAuth()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [favoritesWithCampaigns, setFavoritesWithCampaigns] = useState<FavoriteWithCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // IDs des campagnes favorites (pour vérification rapide)
  const favoriteIds = useMemo(() => {
    return new Set(favorites.map(f => f.campaign_id))
  }, [favorites])

  // Charger les favoris de l'utilisateur via l'API
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([])
      setFavoritesWithCampaigns([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/favorites')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Erreur lors du chargement des favoris')
      }

      setFavorites(json.favorites || [])
    } catch (err: any) {
      console.error('Error fetching favorites:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Charger les favoris avec les détails des campagnes via l'API
  const fetchFavoritesWithCampaigns = useCallback(async () => {
    if (!user) {
      setFavoritesWithCampaigns([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/favorites?withCampaigns=true')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Erreur lors du chargement des favoris')
      }

      const data = json.favorites || []

      // Transformer les données
      const transformed = data.map((f: any) => ({
        id: f.id,
        campaign_id: f.campaign_id,
        created_at: f.created_at,
        campaign: f.campaign
      }))

      setFavoritesWithCampaigns(transformed)
      // Mettre aussi à jour les IDs simples
      setFavorites(data.map((f: any) => ({
        id: f.id,
        campaign_id: f.campaign_id,
        created_at: f.created_at,
      })))
    } catch (err: any) {
      console.error('Error fetching favorites with campaigns:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Vérifier si une campagne est en favoris
  const isFavorite = useCallback((campaignId: string): boolean => {
    return favoriteIds.has(campaignId)
  }, [favoriteIds])

  // Ajouter un favori via l'API
  const addFavorite = useCallback(async (campaignId: string): Promise<boolean> => {
    if (!user) {
      setError('Vous devez être connecté pour ajouter des favoris')
      return false
    }

    try {
      setError(null)

      // Mise à jour optimiste
      const optimisticFav: Favorite = {
        id: `temp-${Date.now()}`,
        campaign_id: campaignId,
        created_at: new Date().toISOString(),
      }
      setFavorites(prev => [optimisticFav, ...prev])

      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      })

      const json = await res.json()

      if (!res.ok) {
        // Rollback optimiste
        setFavorites(prev => prev.filter(f => f.id !== optimisticFav.id))
        throw new Error(json.error || "Erreur lors de l'ajout aux favoris")
      }

      // Remplacer le favori temporaire par le vrai
      if (json.favorite) {
        setFavorites(prev =>
          prev.map(f => f.id === optimisticFav.id ? json.favorite : f)
        )
      }

      return true
    } catch (err: any) {
      console.error('Error adding favorite:', err)
      setError(err.message)
      return false
    }
  }, [user])

  // Supprimer un favori via l'API
  const removeFavorite = useCallback(async (campaignId: string): Promise<boolean> => {
    if (!user) {
      setError('Vous devez être connecté pour supprimer des favoris')
      return false
    }

    try {
      setError(null)

      // Sauvegarde pour rollback
      const previousFavorites = [...favorites]
      const previousWithCampaigns = [...favoritesWithCampaigns]

      // Mise à jour optimiste
      setFavorites(prev => prev.filter(f => f.campaign_id !== campaignId))
      setFavoritesWithCampaigns(prev => prev.filter(f => f.campaign_id !== campaignId))

      const res = await fetch(`/api/favorites?campaignId=${campaignId}`, {
        method: 'DELETE',
      })

      const json = await res.json()

      if (!res.ok) {
        // Rollback
        setFavorites(previousFavorites)
        setFavoritesWithCampaigns(previousWithCampaigns)
        throw new Error(json.error || 'Erreur lors de la suppression du favori')
      }

      return true
    } catch (err: any) {
      console.error('Error removing favorite:', err)
      setError(err.message)
      return false
    }
  }, [user, favorites, favoritesWithCampaigns])

  // Basculer un favori (ajouter/supprimer)
  const toggleFavorite = useCallback(async (campaignId: string): Promise<boolean> => {
    if (isFavorite(campaignId)) {
      return removeFavorite(campaignId)
    } else {
      return addFavorite(campaignId)
    }
  }, [isFavorite, addFavorite, removeFavorite])

  // Charger les favoris au montage et quand l'utilisateur change
  useEffect(() => {
    if (!authLoading) {
      fetchFavorites()
    }
  }, [user, authLoading, fetchFavorites])

  return {
    favorites,
    favoritesWithCampaigns,
    favoriteIds,
    loading: loading || authLoading,
    error,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    fetchFavorites,
    fetchFavoritesWithCampaigns,
    isAuthenticated: !!user
  }
}
