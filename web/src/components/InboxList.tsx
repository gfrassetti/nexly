"use client";

type Item = {
  id: string;
  title: string;
  last: string;
  at: string;
};

interface InboxListProps {
  items: Item[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export default function InboxList({ items, activeId, onSelect }: InboxListProps) {
  return (
    <ul className="divide-y divide-neutral-800/60">
      {items.map((it) => (
        <li
          key={it.id}
          onClick={() => onSelect(it.id)}
          className={`p-3 hover:bg-neutral-800/60 cursor-pointer ${
            activeId === it.id ? "bg-neutral-900" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-medium">{it.title}</div>
            <div className="text-xs text-neutral-400">{it.at}</div>
          </div>
          <div className="text-sm text-neutral-300">{it.last}</div>
        </li>
      ))}
    </ul>
  );
}
