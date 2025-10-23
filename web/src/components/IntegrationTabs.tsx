"use client";

type Provider = "whatsapp" | "instagram" | "messenger" | "telegram" | "tiktok";

export default function IntegrationTabs({
  provider,
  onChange,
}: {
  provider: Provider;
  onChange: (p: Provider) => void;
}) {
  const Tab = ({ id, label }: { id: Provider; label: string }) => (
    <button
      onClick={() => onChange(id)}
      className={`px-3 py-1 m-2 rounded-2xl text-sm border ${
        provider === id
          ? "bg-neutral-200 text-neutral-900 border-transparent"
          : "bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center">
      <Tab id="whatsapp" label="whatsapp" />
      <Tab id="instagram" label="instagram" />
      <Tab id="messenger" label="messenger" />
      <Tab id="telegram" label="telegram" />
      <Tab id="tiktok" label="tiktok" />
    </div>
  );
}
