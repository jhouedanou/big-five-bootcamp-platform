"use client"

import { useState, useEffect } from "react"

interface ProductPrice {
  price: number
  formatted: string
  currency: string
  label: string // e.g. "25 000"
}

const DEFAULT_PRICE: ProductPrice = {
  price: 25000,
  formatted: "25 000 XOF",
  currency: "XOF",
  label: "25 000",
}

let cachedPrice: ProductPrice | null = null

export function useProductPrice() {
  const [productPrice, setProductPrice] = useState<ProductPrice>(cachedPrice ?? DEFAULT_PRICE)
  const [loading, setLoading] = useState(!cachedPrice)

  useEffect(() => {
    if (cachedPrice) return

    fetch("/api/payment/product")
      .then((res) => res.json())
      .then((data) => {
        const p: ProductPrice = {
          price: data.price ?? DEFAULT_PRICE.price,
          formatted: data.formatted ?? DEFAULT_PRICE.formatted,
          currency: data.currency ?? DEFAULT_PRICE.currency,
          label: data.price?.toLocaleString("fr-FR") ?? DEFAULT_PRICE.label,
        }
        cachedPrice = p
        setProductPrice(p)
      })
      .catch(() => {
        setProductPrice(DEFAULT_PRICE)
      })
      .finally(() => setLoading(false))
  }, [])

  return { ...productPrice, loading }
}
