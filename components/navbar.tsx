"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Big Five Bootcamp"
            width={40}
            height={40}
            className="h-10 w-10"
            priority
          />
          <span className="font-[family-name:var(--font-heading)] text-xl font-bold text-foreground">Big Five Bootcamp</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Fonctionnalites
          </Link>
          <Link href="/#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Tarifs
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Demo
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" asChild>
            <Link href="/login">Connexion</Link>
          </Button>
          <Button asChild className="shadow-lg shadow-primary/25">
            <Link href="/register">Essai gratuit 30j</Link>
          </Button>
        </div>

        <button
          type="button"
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="flex flex-col gap-2 px-4 py-4">
            <Link
              href="/#features"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              Fonctionnalites
            </Link>
            <Link
              href="/#pricing"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              Tarifs
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              Demo
            </Link>
            <hr className="my-2 border-border" />
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              Connexion
            </Link>
            <Button asChild className="mt-2">
              <Link href="/register" onClick={() => setIsOpen(false)}>
                Essai gratuit 30j
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
