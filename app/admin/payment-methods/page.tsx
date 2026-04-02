"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  CreditCard,
  Smartphone,
  Globe,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Wallet,
  Building2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

interface PaymentMethod {
  code: string;
  name: string;
  icon: React.ElementType;
  description: string;
  type: "mobile_money" | "card" | "bank" | "wallet";
}

interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  currency: string;
  methods: PaymentMethod[];
}

interface PaymentMethodsConfig {
  [countryCode: string]: {
    enabled: boolean;
    methods: {
      [methodCode: string]: boolean;
    };
  };
}

// ============================================================================
// Données de référence — Moyens de paiement Moneroo par pays
// ============================================================================

const PAYMENT_METHODS: Record<string, PaymentMethod> = {
  orange_money: {
    code: "orange_money",
    name: "Orange Money",
    icon: Smartphone,
    description: "Paiement via Orange Money",
    type: "mobile_money",
  },
  mtn_money: {
    code: "mtn_money",
    name: "MTN Mobile Money",
    icon: Smartphone,
    description: "Paiement via MTN MoMo",
    type: "mobile_money",
  },
  moov_money: {
    code: "moov_money",
    name: "Moov Money",
    icon: Smartphone,
    description: "Paiement via Moov Money",
    type: "mobile_money",
  },
  wave: {
    code: "wave",
    name: "Wave",
    icon: Wallet,
    description: "Paiement via Wave",
    type: "wallet",
  },
  free_money: {
    code: "free_money",
    name: "Free Money",
    icon: Smartphone,
    description: "Paiement via Free Money",
    type: "mobile_money",
  },
  visa: {
    code: "visa",
    name: "Visa",
    icon: CreditCard,
    description: "Carte bancaire Visa",
    type: "card",
  },
  mastercard: {
    code: "mastercard",
    name: "Mastercard",
    icon: CreditCard,
    description: "Carte bancaire Mastercard",
    type: "card",
  },
  bank_transfer: {
    code: "bank_transfer",
    name: "Virement bancaire",
    icon: Building2,
    description: "Virement depuis un compte bancaire",
    type: "bank",
  },
};

const COUNTRIES: CountryConfig[] = [
  {
    code: "CI",
    name: "Côte d'Ivoire",
    flag: "🇨🇮",
    currency: "XOF",
    methods: [
      PAYMENT_METHODS.orange_money,
      PAYMENT_METHODS.mtn_money,
      PAYMENT_METHODS.moov_money,
      PAYMENT_METHODS.wave,
      PAYMENT_METHODS.visa,
      PAYMENT_METHODS.mastercard,
    ],
  },
  {
    code: "SN",
    name: "Sénégal",
    flag: "🇸🇳",
    currency: "XOF",
    methods: [
      PAYMENT_METHODS.orange_money,
      PAYMENT_METHODS.free_money,
      PAYMENT_METHODS.wave,
      PAYMENT_METHODS.visa,
      PAYMENT_METHODS.mastercard,
    ],
  },
  {
    code: "ML",
    name: "Mali",
    flag: "🇲🇱",
    currency: "XOF",
    methods: [
      PAYMENT_METHODS.orange_money,
      PAYMENT_METHODS.moov_money,
      PAYMENT_METHODS.wave,
      PAYMENT_METHODS.visa,
      PAYMENT_METHODS.mastercard,
    ],
  },
  {
    code: "BF",
    name: "Burkina Faso",
    flag: "🇧🇫",
    currency: "XOF",
    methods: [
      PAYMENT_METHODS.orange_money,
      PAYMENT_METHODS.moov_money,
      PAYMENT_METHODS.wave,
      PAYMENT_METHODS.visa,
      PAYMENT_METHODS.mastercard,
    ],
  },
  {
    code: "TG",
    name: "Togo",
    flag: "🇹🇬",
    currency: "XOF",
    methods: [
      PAYMENT_METHODS.moov_money,
      PAYMENT_METHODS.visa,
      PAYMENT_METHODS.mastercard,
    ],
  },
  {
    code: "BJ",
    name: "Bénin",
    flag: "🇧🇯",
    currency: "XOF",
    methods: [
      PAYMENT_METHODS.mtn_money,
      PAYMENT_METHODS.moov_money,
      PAYMENT_METHODS.visa,
      PAYMENT_METHODS.mastercard,
    ],
  },
  {
    code: "NE",
    name: "Niger",
    flag: "🇳🇪",
    currency: "XOF",
    methods: [
      PAYMENT_METHODS.orange_money,
      PAYMENT_METHODS.moov_money,
      PAYMENT_METHODS.visa,
      PAYMENT_METHODS.mastercard,
    ],
  },
  {
    code: "GW",
    name: "Guinée-Bissau",
    flag: "🇬🇼",
    currency: "XOF",
    methods: [PAYMENT_METHODS.orange_money, PAYMENT_METHODS.visa, PAYMENT_METHODS.mastercard],
  },
  {
    code: "GN",
    name: "Guinée",
    flag: "🇬🇳",
    currency: "GNF",
    methods: [
      PAYMENT_METHODS.orange_money,
      PAYMENT_METHODS.mtn_money,
      PAYMENT_METHODS.visa,
      PAYMENT_METHODS.mastercard,
    ],
  },
  {
    code: "CM",
    name: "Cameroun",
    flag: "🇨🇲",
    currency: "XAF",
    methods: [
      PAYMENT_METHODS.orange_money,
      PAYMENT_METHODS.mtn_money,
      PAYMENT_METHODS.visa,
      PAYMENT_METHODS.mastercard,
    ],
  },
];

// ============================================================================
// Helpers
// ============================================================================

function getDefaultConfig(): PaymentMethodsConfig {
  const config: PaymentMethodsConfig = {};
  for (const country of COUNTRIES) {
    config[country.code] = {
      enabled: true,
      methods: {},
    };
    for (const method of country.methods) {
      config[country.code].methods[method.code] = true;
    }
  }
  return config;
}

function getMethodTypeLabel(type: PaymentMethod["type"]): string {
  switch (type) {
    case "mobile_money":
      return "Mobile Money";
    case "card":
      return "Carte bancaire";
    case "bank":
      return "Banque";
    case "wallet":
      return "Portefeuille";
  }
}

function getMethodTypeColor(type: PaymentMethod["type"]): string {
  switch (type) {
    case "mobile_money":
      return "bg-green-500/10 text-green-600 border-green-200";
    case "card":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "bank":
      return "bg-purple-500/10 text-purple-600 border-purple-200";
    case "wallet":
      return "bg-amber-500/10 text-amber-600 border-amber-200";
  }
}

// ============================================================================
// Composant principal
// ============================================================================

export default function PaymentMethodsPage() {
  const [config, setConfig] = useState<PaymentMethodsConfig>(getDefaultConfig());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [savedConfig, setSavedConfig] = useState<PaymentMethodsConfig | null>(null);

  const supabase = createClient();

  // Charger la config depuis site_settings
  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "payment_methods_config")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Erreur chargement config:", error);
        toast.error("Erreur lors du chargement de la configuration");
      }

      if (data?.value && data.value !== "{}") {
        try {
          const parsed = JSON.parse(data.value) as PaymentMethodsConfig;
          // Fusionner avec les valeurs par défaut (pour les nouveaux pays/méthodes)
          const merged = getDefaultConfig();
          for (const countryCode of Object.keys(parsed)) {
            if (merged[countryCode]) {
              merged[countryCode].enabled = parsed[countryCode].enabled;
              for (const methodCode of Object.keys(parsed[countryCode].methods)) {
                if (merged[countryCode].methods[methodCode] !== undefined) {
                  merged[countryCode].methods[methodCode] =
                    parsed[countryCode].methods[methodCode];
                }
              }
            }
          }
          setConfig(merged);
          setSavedConfig(merged);
        } catch {
          console.warn("Config invalide, utilisation des valeurs par défaut");
          const defaults = getDefaultConfig();
          setConfig(defaults);
          setSavedConfig(defaults);
        }
      } else {
        const defaults = getDefaultConfig();
        setConfig(defaults);
        setSavedConfig(defaults);
      }
    } catch (err) {
      console.error("Erreur:", err);
      toast.error("Impossible de charger la configuration");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Détecter les changements
  useEffect(() => {
    if (savedConfig) {
      setHasChanges(JSON.stringify(config) !== JSON.stringify(savedConfig));
    }
  }, [config, savedConfig]);

  // Sauvegarder la config
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          {
            key: "payment_methods_config",
            value: JSON.stringify(config),
            description: "Configuration des moyens de paiement Moneroo par pays",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (error) {
        console.error("Erreur sauvegarde:", error);
        toast.error("Erreur lors de la sauvegarde");
        return;
      }

      setSavedConfig(JSON.parse(JSON.stringify(config)));
      setHasChanges(false);
      toast.success("Configuration des paiements sauvegardée");
    } catch (err) {
      console.error("Erreur:", err);
      toast.error("Impossible de sauvegarder");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle pays entier
  const toggleCountry = (countryCode: string) => {
    setConfig((prev) => ({
      ...prev,
      [countryCode]: {
        ...prev[countryCode],
        enabled: !prev[countryCode].enabled,
      },
    }));
  };

  // Toggle un moyen de paiement
  const toggleMethod = (countryCode: string, methodCode: string) => {
    setConfig((prev) => ({
      ...prev,
      [countryCode]: {
        ...prev[countryCode],
        methods: {
          ...prev[countryCode].methods,
          [methodCode]: !prev[countryCode].methods[methodCode],
        },
      },
    }));
  };

  // Expand/collapse pays
  const toggleExpanded = (countryCode: string) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(countryCode)) {
        next.delete(countryCode);
      } else {
        next.add(countryCode);
      }
      return next;
    });
  };

  // Tout activer / désactiver
  const toggleAll = (enabled: boolean) => {
    setConfig((prev) => {
      const next = { ...prev };
      for (const code of Object.keys(next)) {
        next[code] = {
          ...next[code],
          enabled,
          methods: Object.fromEntries(
            Object.keys(next[code].methods).map((m) => [m, enabled])
          ),
        };
      }
      return next;
    });
  };

  // Stats
  const enabledCountries = Object.values(config).filter((c) => c.enabled).length;
  const totalMethods = Object.values(config).reduce(
    (sum, c) => sum + Object.values(c.methods).filter(Boolean).length,
    0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-slate-500 text-sm">Chargement de la configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white shadow-lg shadow-orange-500/25">
              <CreditCard className="w-6 h-6" />
            </div>
            Moyens de paiement
          </h1>
          <p className="text-slate-500 mt-2">
            Configurez les moyens de paiement Moneroo disponibles par pays
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadConfig}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25 gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Indicateur changements non sauvegardés */}
      {hasChanges && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Vous avez des modifications non sauvegardées.</span>
        </div>
      )}

      {/* Stats résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Globe className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{enabledCountries}</p>
              <p className="text-xs text-slate-500">Pays actifs / {COUNTRIES.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalMethods}</p>
              <p className="text-xs text-slate-500">Méthodes actives</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">Moneroo</p>
              <p className="text-xs text-slate-500">Passerelle de paiement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleAll(true)}
          className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
        >
          <ToggleRight className="w-4 h-4" />
          Tout activer
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleAll(false)}
          className="gap-2 text-red-700 border-red-200 hover:bg-red-50"
        >
          <ToggleLeft className="w-4 h-4" />
          Tout désactiver
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setExpandedCountries(
              expandedCountries.size === COUNTRIES.length
                ? new Set()
                : new Set(COUNTRIES.map((c) => c.code))
            )
          }
          className="gap-2"
        >
          {expandedCountries.size === COUNTRIES.length ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Tout replier
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Tout déplier
            </>
          )}
        </Button>
      </div>

      {/* Liste des pays */}
      <div className="space-y-3">
        {COUNTRIES.map((country) => {
          const countryConfig = config[country.code];
          const isExpanded = expandedCountries.has(country.code);
          const enabledMethodsCount = Object.values(countryConfig.methods).filter(Boolean).length;
          const totalMethodsCount = country.methods.length;

          return (
            <div
              key={country.code}
              className={`bg-white rounded-xl border shadow-sm transition-all duration-200 ${
                countryConfig.enabled
                  ? "border-slate-200 hover:border-slate-300"
                  : "border-slate-100 opacity-60"
              }`}
            >
              {/* En-tête pays */}
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Toggle pays */}
                <button
                  onClick={() => toggleCountry(country.code)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                    countryConfig.enabled ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  aria-label={`${countryConfig.enabled ? "Désactiver" : "Activer"} ${country.name}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      countryConfig.enabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>

                {/* Infos pays */}
                <button
                  onClick={() => toggleExpanded(country.code)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <span className="text-2xl">{country.flag}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{country.name}</h3>
                    <p className="text-xs text-slate-400">
                      {country.currency} · {enabledMethodsCount}/{totalMethodsCount} méthodes
                      actives
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {/* Badge status */}
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    countryConfig.enabled
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {countryConfig.enabled ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Actif
                    </span>
                  ) : (
                    "Inactif"
                  )}
                </div>
              </div>

              {/* Méthodes de paiement (expanded) */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {country.methods.map((method) => {
                      const isEnabled = countryConfig.methods[method.code];
                      const Icon = method.icon;

                      return (
                        <button
                          key={method.code}
                          onClick={() => toggleMethod(country.code, method.code)}
                          disabled={!countryConfig.enabled}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${
                            !countryConfig.enabled
                              ? "border-slate-100 bg-slate-50 cursor-not-allowed opacity-50"
                              : isEnabled
                                ? "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
                                : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg border ${getMethodTypeColor(method.type)}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium ${
                                isEnabled ? "text-slate-900" : "text-slate-500"
                              }`}
                            >
                              {method.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {getMethodTypeLabel(method.type)}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isEnabled
                                ? "bg-emerald-500 border-emerald-500"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isEnabled && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Note informative */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h4 className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4" />
          À propos de la configuration
        </h4>
        <ul className="text-sm text-blue-700 space-y-1.5">
          <li>
            • Les moyens de paiement affichés correspondent à ceux supportés par Moneroo dans
            chaque pays.
          </li>
          <li>
            • Désactiver un pays empêchera les utilisateurs de ce pays de souscrire un abonnement.
          </li>
          <li>
            • La disponibilité réelle dépend aussi de la configuration de votre compte Moneroo.
          </li>
          <li>
            • Consultez{" "}
            <a
              href="https://docs.moneroo.io"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium hover:text-blue-900"
            >
              la documentation Moneroo
            </a>{" "}
            pour plus de détails.
          </li>
        </ul>
      </div>
    </div>
  );
}
