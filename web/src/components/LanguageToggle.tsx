"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-neutral-400">Language:</span>
      <button
        onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
      >
        {language === 'en' ? 'ES' : 'EN'}
      </button>
    </div>
  );
}
