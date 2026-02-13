import { ContentGridSkeleton } from "@/components/dashboard/content-card-skeleton";

export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ContentGridSkeleton count={6} />
    </div>
  );
}
