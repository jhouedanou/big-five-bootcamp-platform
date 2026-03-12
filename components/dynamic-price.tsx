"use client"

import { useProductPrice } from "@/hooks/use-product-price"

export function DynamicPrice({
  suffix,
  className,
}: {
  suffix?: string
  className?: string
}) {
  const { label, currency } = useProductPrice()
  return (
    <span className={className}>
      {label} {currency}
      {suffix}
    </span>
  )
}

export function DynamicPriceValue({ className }: { className?: string }) {
  const { label } = useProductPrice()
  return <span className={className}>{label}</span>
}
