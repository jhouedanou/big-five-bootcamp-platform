'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
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
  }
}

export function useFavorites() {
  const { user, loading: authLoading } = useSupabaseAuth()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [favoritesWithCampaigns, setFavoritesWithCampaigns] = useState<FavoriteWithCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = useMemo(() => createClient(), [])

  // IDs des campagnes favorites (pour vérification rapide)
  const favoriteIds = useMemo(() => {
    return new Set(favorites.map(f => f.campaign_id))
  }, [favorites])

  // Charger les favoris de l'utilisateur
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

      const { data, error: fetchError } = await supabase
        .from('favorites')
        .select('id, campaign_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setFavorites(data || [])
    } catch (err: any) {
      console.error('Error fetching favorites:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  // Charger les favoris avec les détails des campagnes
  const fetchFavoritesWithCampaigns = useCallback(async () => {
    if (!user) {
      setFavoritesWithCampaigns([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('favorites')
        .select(`
          id,
          campaign_id,
          created_at,
          campaign:campaigns (
            id,
            title,
            thumbnail,
            platforms,
            category,
            format,
            description
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Transformer les données
      const transformed = (data || []).map((f: any) => ({
        id: f.id,
        campaign_id: f.campaign_id,
        created_at: f.created_at,
        campaign: f.campaign
      }))

      setFavoritesWithCampaigns(transformed)
    } catch (err: any) {
      console.error('Error fetching favorites with campaigns:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  // Vérifier si une campagne est en favoris
  const isFavorite = useCallback((campaignId: string): boolean => {
    return favoriteIds.has(campaignId)
  }, [favoriteIds])

  // Ajouter un favori
  const addFavorite = useCallback(async (campaignId: string): Promise<boolean> => {
    if (!user) {
      setError('Vous devez être connecté pour ajouter des favoris')
      return false
    }

    try {
      setError(null)

      const { data, error: insertError } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          campaign_id: campaignId
        })
        .select('id, campaign_id, created_at')
        .single()

      if (insertError) {
        // Si c'est une erreur de doublon, ignorer
        if (insertError.code === '23505') {
          return true
        }
        throw insertError
      }

      // Mettre à jour le state local
      setFavorites(prev => [data, ...prev])
      return true
    } catch (err: any) {
      console.error('Error adding favorite:', err)
      setError(err.message)
      return false
    }
  }, [user, supabase])

  // Supprimer un favori
  const removeFavorite = useCallback(async (campaignId: string): Promise<boolean> => {
    if (!user) {
      setError('Vous devez être connecté pour supprimer des favoris')
      return false
    }

    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('campaign_id', campaignId)

      if (deleteError) throw deleteError

      // Mettre à jour le state local
      setFavorites(prev => prev.filter(f => f.campaign_id !== campaignId))
      setFavoritesWithCampaigns(prev => prev.filter(f => f.campaign_id !== campaignId))
      return true
    } catch (err: any) {
      console.error('Error removing favorite:', err)
      setError(err.message)
      return false
    }
  }, [user, supabase])

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
