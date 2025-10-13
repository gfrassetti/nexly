"use client";

import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import AuthGuard from "@/components/AuthGuard";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAuth={true}>
      <SubscriptionProvider>
        <ErrorBoundary>
          <div className="min-h-screen grid grid-cols-[260px_1fr] bg-accent-dark text-neutral-100">
            <Sidebar />

            <div className="flex flex-col">
              <Topbar />
              <main className="flex-1 overflow-auto p-4">{children}</main>
            </div>
          </div>
        </ErrorBoundary>
      </SubscriptionProvider>
    </AuthGuard>
  );
}
