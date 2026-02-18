import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { authOptions } from "@/lib/auth"
import MemoViewer from "@/components/MemoViewer";
import Header from "@/components/Header";

interface MemoPageProps {
  params: Promise<{ id: string }>;
}

export default async function MemoPage({ params }: MemoPageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow">
          <Suspense
            fallback={
              <div className="p-6">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            }
          >
            <MemoViewer memoId={id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
