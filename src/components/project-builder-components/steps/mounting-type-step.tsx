"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MountingTypeStepProps {
  selectedMountingType: number | null;
  onSelect: (mountingTypeId: number) => void;
}

export default function MountingTypeStep({ selectedMountingType, onSelect }: MountingTypeStepProps) {
  const [loading, setLoading] = useState(true);

  const mountingTypes = [
    { id: 1, name: "Wall Mount", description: "Mounted to wall surface" },
    { id: 2, name: "Floor Mount", description: "Mounted to floor surface" },
    { id: 3, name: "Post Mount", description: "Freestanding post installation" },
    { id: 4, name: "Fascia Mount", description: "Mounted to fascia board" },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-[#f5f5f5] border border-gray-200 rounded-lg p-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-3 bg-gray-200 rounded w-28 mb-2"></div>
                <div className="h-2.5 bg-gray-200 rounded w-40"></div>
              </div>
              <div className="w-5 h-5 rounded-full bg-gray-200"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0 pr-1">
      <div className="flex flex-col gap-2 pb-2">
        {mountingTypes.map((mountingType, index) => {
          const isSelected = selectedMountingType === mountingType.id;
          return (
            <motion.div
              key={mountingType.id}
              onClick={() => onSelect(mountingType.id)}
              className={`bg-[#f5f5f5] border rounded-lg p-3 cursor-pointer transition-all duration-300 ${
                isSelected
                  ? 'border-rail-light-blue shadow-sm'
                  : 'border-gray-200 hover:border-rail-light-blue'
              }`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-xs">{mountingType.name}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">{mountingType.description}</p>
                </div>
                <span
                  className={`flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full border-2 text-[10px] ${
                    isSelected
                      ? 'bg-rail-light-blue border-rail-light-blue text-white'
                      : 'border-gray-300 text-gray-400'
                  }`}
                >
                  {isSelected ? '✓' : ''}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
