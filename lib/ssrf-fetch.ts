import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Garde-fous anti-SSRF, partagés par les routes serveur qui déclenchent un
 * `fetch` vers une URL fournie par un admin (thumbnails vidéo, validation
 * média). Sans ces contrôles, un admin pourrait scanner le réseau interne ou
 * lire les métadonnées cloud (169.254.169.254).
 *
 * Runtime Node.js requis (node:dns, node:net).
 */

function ipv4IsBlocked(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true; // format inattendu → on bloque par prudence
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + métadonnées cloud
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 (bench)
  if (a >= 224) return true; // multicast + réservé
  return false;
}

function addressIsBlocked(addr: string): boolean {
  const v = isIP(addr);
  if (v === 4) return ipv4IsBlocked(addr);
  if (v === 6) {
    const lower = addr.toLowerCase();
    // IPv4-mappé (::ffff:a.b.c.d) → on revalide la partie v4.
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return ipv4IsBlocked(mapped[1]);
    if (lower === "::1" || lower === "::") return true; // loopback / unspecified
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local fc00::/7
    return false;
  }
  return true; // pas une IP reconnue → bloquer
}

/**
 * Valide qu'une URL est http(s) et ne résout pas vers une adresse interne.
 * Lève une erreur sinon.
 */
export async function assertPublicHttpUrl(raw: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("URL invalide");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Schéma non autorisé");
  }
  const host = parsed.hostname;
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(addressIsBlocked)) {
    throw new Error("Cible interne interdite");
  }
}

/**
 * `fetch` durci contre la SSRF : valide chaque saut (redirections incluses,
 * gérées manuellement) avant de l'exécuter.
 */
export async function ssrfSafeFetch(
  rawUrl: string,
  init: RequestInit = {},
  maxRedirects = 3,
): Promise<Response> {
  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicHttpUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      current = new URL(location, current).toString();
      continue;
    }
    return res;
  }
  throw new Error("Trop de redirections");
}

/**
 * Variante de `ssrfSafeFetch` qui retourne aussi l'URL finale après
 * redirections — utile pour détecter une redirection Google Drive vers une
 * page de connexion (accounts.google.com), signe d'un fichier non public.
 */
export async function ssrfSafeFetchTraced(
  rawUrl: string,
  init: RequestInit = {},
  maxRedirects = 5,
): Promise<{ res: Response; finalUrl: string; redirectedToLogin: boolean }> {
  let current = rawUrl;
  let redirectedToLogin = false;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicHttpUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return { res, finalUrl: current, redirectedToLogin };
      const next = new URL(location, current).toString();
      if (/accounts\.google\.com|ServiceLogin|signin/i.test(next)) {
        redirectedToLogin = true;
      }
      current = next;
      continue;
    }
    return { res, finalUrl: current, redirectedToLogin };
  }
  throw new Error("Trop de redirections");
}
