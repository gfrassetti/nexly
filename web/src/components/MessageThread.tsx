"use client";

export default function MessageThread() {
  // Placeholder. Puedes mapear mensajes reales aquí.
  const messages = [
    { id: 1, who: "in", text: "Hola, ¿tenés stock del producto X?" },
    { id: 2, who: "out", text: "Hola! Sí, tenemos :)" },
  ];

  return (
    <div className="p-4 space-y-2">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`max-w-[75%] px-3 py-2 rounded-lg ${
            m.who === "out"
              ? "ml-auto bg-emerald-600 text-white"
              : "bg-neutral-700 text-neutral-100"
          }`}
        >
          {m.text}
        </div>
      ))}
    </div>
  );
}
