"use client";

import { Package } from "lucide-react";
import { useRouter } from "next/navigation";

export function EmptyState() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[370px] bg-[#f5f5f5] rounded-md text-center">
      <Package size={48} className="text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        Start creating your first railing design and place your order to see it here.
      </p>
      <button
        onClick={() => router.push('/builder')}
        className="bg-rail-light-blue px-6 py-2.5 text-white text-sm rounded-md hover:bg-[#333] transition-colors cursor-pointer flex items-center gap-2 font-medium"
      >
        <Package size={16} />
        Create Your First Design
      </button>
    </div>
  );
}
