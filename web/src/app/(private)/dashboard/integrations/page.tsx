"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "react-hot-toast";

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch("/integrations")
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar integraciones");
        return res.json();
      })
      .then((data) => setIntegrations(data))
      .catch((err) => {
        console.error(err);
        toast.error("Error cargando integraciones");
      });
  }, []);

  async function connect(provider: string) {
    setLoading(true);
    try {
      const res = await apiFetch("/integrations", {
        method: "POST",
        body: JSON.stringify({ provider }),
      });

      if (res.ok) {
        const newIntegration = await res.json();
        setIntegrations((prev) => [...prev, newIntegration]);
        toast.success(`Integración con ${provider} conectada correctamente`);
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error.message || `Error al conectar ${provider}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de red al conectar integración");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Integraciones</h2>
      <div className="flex gap-4">
        <button
          onClick={() => connect("whatsapp")}
          disabled={loading}
          className="px-4 py-2 rounded bg-green-600 hover:bg-green-700"
        >
          Conectar WhatsApp
        </button>
        <button
          onClick={() => connect("instagram")}
          disabled={loading}
          className="px-4 py-2 rounded bg-pink-600 hover:bg-pink-700"
        >
          Conectar Instagram
        </button>
        <button
          onClick={() => connect("messenger")}
          disabled={loading}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
        >
          Conectar Messenger
        </button>
      </div>

      <div>
        <h3 className="text-lg font-medium mt-6 mb-2">Integraciones activas</h3>
        <ul className="space-y-2">
          {integrations.map((i) => (
            <li
              key={i._id}
              className="px-3 py-2 rounded bg-neutral-800 flex justify-between"
            >
              <span>{i.name || i.provider}</span>
              <span className="text-sm text-neutral-400">{i.provider}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


