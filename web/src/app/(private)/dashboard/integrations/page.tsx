"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

type Integration = {
  _id: string;
  provider: string;
  status: string;
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/integrations`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setIntegrations(data))
      .catch((err) => {
        console.error(err);
        toast.error("Error cargando integraciones");
      });
  }, []);

  async function connect(provider: string) {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/integrations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider }),
          credentials: "include",
        }
      );

      if (res.ok) {
        const newIntegration = await res.json();
        setIntegrations((prev) => [...prev, newIntegration]);
        toast.success(`Integración con ${provider} conectada correctamente`);
      } else {
        const error = await res.json();
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
      <Toaster position="top-right" />

      <h2 className="text-xl font-semibold">Integraciones</h2>

      <div className="flex gap-4">
        <button
          onClick={() => connect("whatsapp")}
          disabled={loading}
          className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          Conectar WhatsApp
        </button>
        <button
          onClick={() => connect("instagram")}
          disabled={loading}
          className="px-4 py-2 rounded bg-pink-600 hover:bg-pink-700 disabled:opacity-50"
        >
          Conectar Instagram
        </button>
        <button
          onClick={() => connect("messenger")}
          disabled={loading}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          Conectar Messenger
        </button>
      </div>

      <ul className="space-y-2">
        {integrations.map((i) => (
          <li
            key={i._id}
            className="border rounded p-3 flex justify-between items-center bg-neutral-900"
          >
            <span className="capitalize">{i.provider}</span>
            <span className="text-sm text-neutral-400">{i.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

