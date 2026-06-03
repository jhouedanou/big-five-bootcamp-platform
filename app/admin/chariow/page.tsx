"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Copy,
  Check,
  Loader2,
  Webhook,
  KeyRound,
  Package,
  Globe,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface ChariowProduct {
  envKey: string;
  plan: string;
  billing: string;
  productId: string;
  configured: boolean;
  expectedPrice: number;
  currency: string;
}

interface ChariowConfig {
  pulse: { url: string; event: string };
  redirectUrlTemplate: string;
  customMetadataKeys: string[];
  api: { baseUrl: string; key: { configured: boolean; masked: string } };
  publicBaseUrl: string;
  baseUrlWarning: string | null;
  products: ChariowProduct[];
  countryIso: Record<string, string>;
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label || "Valeur"} copié`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copie impossible");
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!value}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copié" : "Copier"}
    </button>
  );
}

/** Ligne « libellé + valeur monospace + bouton copier ». */
function Field({
  label,
  value,
  hint,
  copyLabel,
}: {
  label: string;
  value: string;
  hint?: string;
  copyLabel?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-900">{label}</label>
        <CopyButton value={value} label={copyLabel || label} />
      </div>
      {hint && <p className="mb-1 mt-0.5 text-xs text-gray-500">{hint}</p>}
      <code className="mt-1 block w-full overflow-x-auto rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-800">
        {value || "—"}
      </code>
    </div>
  );
}

export default function ChariowConfigPage() {
  const [config, setConfig] = useState<ChariowConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/chariow-config");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        setConfig(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Chargement de la configuration Chariow…</span>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>{error || "Configuration indisponible"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-gray-900 md:text-3xl">
          Configuration Chariow
        </h1>
        <p className="mt-1 text-gray-600">
          Tous les renseignements à reporter dans Chariow et son Pulse (webhook).
        </p>
      </div>

      {config.baseUrlWarning && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{config.baseUrlWarning}</p>
        </div>
      )}

      {/* Pulse (webhook) */}
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#F2B33D]/10 p-2">
              <Webhook className="h-5 w-5 text-[#F2B33D]" />
            </div>
            <div>
              <CardTitle className="text-gray-900">Pulse (webhook)</CardTitle>
              <CardDescription className="text-gray-600">
                Chariow → Automation → Pulses. Créez un Pulse sur l'événement ci-dessous pointant vers l'URL.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="max-w-2xl space-y-4">
          <Field
            label="URL du Pulse"
            value={config.pulse.url}
            hint="À coller dans le champ URL du Pulse."
            copyLabel="URL du Pulse"
          />
          <Field
            label="Événement"
            value={config.pulse.event}
            hint="Type d'événement à sélectionner pour ce Pulse."
            copyLabel="Événement"
          />
        </CardContent>
      </Card>

      {/* Checkout / redirection */}
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#F2B33D]/10 p-2">
              <Globe className="h-5 w-5 text-[#F2B33D]" />
            </div>
            <div>
              <CardTitle className="text-gray-900">Checkout & redirection</CardTitle>
              <CardDescription className="text-gray-600">
                URL publique et paramètres envoyés à l'initialisation du checkout.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="max-w-2xl space-y-4">
          <Field
            label="URL publique de l'application"
            value={config.publicBaseUrl}
            copyLabel="URL publique"
          />
          <Field
            label="URL de redirection après paiement"
            value={config.redirectUrlTemplate}
            hint="{REF_COMMAND} est remplacé par la référence réelle à l'exécution."
            copyLabel="URL de redirection"
          />
          <Field
            label="Clé(s) custom_metadata"
            value={config.customMetadataKeys.join(", ")}
            hint="Renvoyées dans le Pulse pour rapprocher le paiement."
            copyLabel="custom_metadata"
          />
        </CardContent>
      </Card>

      {/* API REST */}
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#F2B33D]/10 p-2">
              <KeyRound className="h-5 w-5 text-[#F2B33D]" />
            </div>
            <div>
              <CardTitle className="text-gray-900">API REST</CardTitle>
              <CardDescription className="text-gray-600">
                Endpoint d'API et statut de la clé (variable <code className="rounded bg-gray-100 px-1">CHARIOW_API_KEY</code>).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="max-w-2xl space-y-4">
          <Field label="Base URL de l'API" value={config.api.baseUrl} copyLabel="Base URL API" />
          <div>
            <span className="text-sm font-medium text-gray-900">Clé API (CHARIOW_API_KEY)</span>
            <div className="mt-1 flex items-center gap-2">
              {config.api.key.configured ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-gray-700">Configurée</span>
                  <code className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                    {config.api.key.masked}
                  </code>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">Manquante — à définir dans l'environnement</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Secrète : jamais affichée en clair. Se configure uniquement via les variables d'environnement.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Produits */}
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#F2B33D]/10 p-2">
              <Package className="h-5 w-5 text-[#F2B33D]" />
            </div>
            <div>
              <CardTitle className="text-gray-900">Produits Chariow</CardTitle>
              <CardDescription className="text-gray-600">
                Un produit par plan/facturation. Le prix du produit Chariow DOIT correspondre au prix attendu.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4 font-semibold">Plan</th>
                  <th className="py-2 pr-4 font-semibold">Facturation</th>
                  <th className="py-2 pr-4 font-semibold">Prix attendu</th>
                  <th className="py-2 pr-4 font-semibold">Variable d'env</th>
                  <th className="py-2 pr-4 font-semibold">product_id</th>
                  <th className="py-2 pr-4 font-semibold">État</th>
                  <th className="py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {config.products.map((p) => (
                  <tr key={p.envKey} className="border-b border-gray-100 align-middle">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{p.plan}</td>
                    <td className="py-2.5 pr-4 text-gray-700">{p.billing}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-gray-700">
                      {p.expectedPrice.toLocaleString("fr-FR")} {p.currency}
                    </td>
                    <td className="py-2.5 pr-4">
                      <code className="rounded bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600">{p.envKey}</code>
                    </td>
                    <td className="py-2.5 pr-4">
                      <code className="rounded bg-gray-50 px-1.5 py-0.5 text-xs text-gray-800">
                        {p.productId || "—"}
                      </code>
                    </td>
                    <td className="py-2.5 pr-4">
                      {p.configured ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                          <XCircle className="h-3.5 w-3.5" /> Manquant
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <CopyButton value={p.productId} label={p.envKey} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mapping pays */}
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Mapping pays (phone.country_code)</CardTitle>
          <CardDescription className="text-gray-600">
            Code interne → ISO 3166-1 alpha-2 attendu par Chariow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(config.countryIso).map(([internal, iso]) => (
              <span
                key={internal}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700"
              >
                <span className="font-medium text-gray-900">{internal}</span>
                <span className="text-gray-400">→</span>
                <span>{iso}</span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="pt-2">
        <a
          href="https://chariow.dev/en/guides/pulses"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          <ExternalLink className="h-4 w-4" />
          Documentation des Pulses Chariow
        </a>
      </div>
    </div>
  );
}
