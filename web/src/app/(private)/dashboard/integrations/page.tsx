// web/src/app/(private)/dashboard/integrations/page.tsx
"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  listIntegrations,
  linkIntegration,
  type IntegrationDto,
  type Provider,
} from "@/lib/api";

const BTN_STYLE =
  "px-4 py-2 rounded font-medium text-white hover:opacity-90 transition";

const COLORS: Record<Provider, string> = {
  whatsapp: "bg-emerald-600",
  instagram: "bg-pink-600",
  messenger: "bg-indigo-600",
};

export default function IntegrationsPage() {
  const [items, setItems] = useState<IntegrationDto[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await listIntegrations();
      setItems(data);
    } catch (e: any) {
      // 401 => probablemente sin token en Authorization
      toast.error(e.message || "Error al cargar integraciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function connect(provider: Provider) {
    try {
      setLoading(true);
      // DEMO: externalId = phoneNumberId
      const demoExternal = provider === "whatsapp" ? "123456789012345" : "demo-external";
      await linkIntegration({
        provider,
        externalId: demoExternal,
        phoneNumberId: demoExternal,
        name: `Mi ${provider}`,
        // accessToken: "EAAG...." // en real, recoger del usuario
      });
      toast.success(`Integración ${provider} conectada`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Error de red al conectar integración");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Integraciones</h2>

      <div className="flex gap-3">
        {(["whatsapp", "instagram", "messenger"] as Provider[]).map((p) => (
          <button
            key={p}
            className={`${BTN_STYLE} ${COLORS[p]}`}
            disabled={loading}
            onClick={() => connect(p)}
          >
            Conectar {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading && <p className="text-sm text-neutral-400">Cargando…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-neutral-400">
            No hay integraciones. Conecta al menos una.
          </p>
        )}
        {!loading && items.length > 0 && (
          <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900/40">
            {items.map((it) => (
              <li key={it._id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium capitalize">{it.provider}</div>
                  <div className="text-xs text-neutral-400">
                    ExtId: {it.externalId}
                    {it.phoneNumberId ? ` · PhoneId: ${it.phoneNumberId}` : ""}
                  </div>
                </div>
                <span className="text-xs text-neutral-400">
                  {new Date(it.updatedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
