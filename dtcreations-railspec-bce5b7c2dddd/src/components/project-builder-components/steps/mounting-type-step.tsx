"use client";

import { Plus } from "lucide-react";
import { useState, useEffect } from "react";

interface MountingTypeStepProps {
  selectedMountingType: number | null;
  onSelect: (mountingTypeId: number) => void;
}

export default function MountingTypeStep({ selectedMountingType, onSelect }: MountingTypeStepProps) {
  const [loading, setLoading] = useState(true);
  
  // Placeholder mounting types - replace with actual data
  const mountingTypes = [
    { id: 1, name: "Wall Mount", description: "Mounted to wall surface" },
    { id: 2, name: "Floor Mount", description: "Mounted to floor surface" },
    { id: 3, name: "Post Mount", description: "Freestanding post installation" },
    { id: 4, name: "Fascia Mount", description: "Mounted to fascia board" },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-40"></div>
              </div>
              <div className="w-5 h-5 rounded-full bg-gray-200"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {mountingTypes.map((mountingType) => (
        <div 
          key={mountingType.id} 
          onClick={() => onSelect(mountingType.id)}
          className={`bg-white border rounded-lg p-4 cursor-pointer transition-all duration-500 overflow-hidden group ${
            selectedMountingType === mountingType.id 
              ? 'border-rail-light-blue border' 
              : 'border-gray-200 hover:border-rail-light-blue'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">{mountingType.name}</h4>
              <p className="text-xs text-gray-600 mt-1">{mountingType.description}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
              selectedMountingType === mountingType.id 
                ? 'bg-rail-light-blue border-rail-light-blue' 
                : 'border-gray-300 group-hover:bg-rail-light-blue group-hover:border-rail-light-blue'
            }`}>
              <Plus size={12} className={`transition-colors ${
                selectedMountingType === mountingType.id ? 'text-white' : 'text-gray-400 group-hover:text-white'
              }`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
