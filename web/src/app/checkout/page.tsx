"use client";

import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-gray-600">Cargando...</div>}>
        <CheckoutClient />
      </Suspense>
    </div>
  );
}
