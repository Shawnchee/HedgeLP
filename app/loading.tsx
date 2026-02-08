import { Header } from "@/components/header";

/**
 * Global loading UI displayed while route segments are being fetched.
 * Uses skeleton placeholders to prevent layout shift.
 */
export default function Loading() {
  return (
    <main className="min-h-screen pt-16 bg-background">
      <Header />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Page title skeleton */}
        <div className="h-8 w-48 bg-secondary/50 rounded-lg animate-pulse" />

        {/* Content cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 bg-secondary/30 rounded-2xl animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
