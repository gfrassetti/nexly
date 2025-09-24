import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-gray-600">Cargando...</div>}>
        <CheckoutClient />
      </Suspense>
    </div>
  );
}
