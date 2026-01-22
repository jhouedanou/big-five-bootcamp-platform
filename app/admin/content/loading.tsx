export default function Loading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1a3a6e] border-t-[#FF6B35]"></div>
          <p className="text-[#9CA3AF]">Chargement...</p>
        </div>
      </div>
    </div>
  );
}
