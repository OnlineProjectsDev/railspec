"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import Image from "next/image";

interface RailingType {
  id: number;
  name: string;
  description: string;
  price: string;
  category: string;
  popular: boolean;
  image: string;
}

interface RailingTypeStepProps {
  selectedRailingType: number | null;
  onSelect: (railingId: number) => void;
}

export default function RailingTypeStep({ selectedRailingType, onSelect }: RailingTypeStepProps) {
  const [railingTypes, setRailingTypes] = useState<RailingType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRailingTypes = async () => {
      try {
        const startTime = Date.now();
        
        const response = await fetch('/data/railing-types.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        const elapsedTime = Date.now() - startTime;
        const minDisplayTime = 300;
        
        if (elapsedTime < minDisplayTime) {
          await new Promise(resolve => setTimeout(resolve, minDisplayTime - elapsedTime));
        }
        
        setRailingTypes(data.railingTypes);
      } catch (error) {
        console.error('Error fetching railing types:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRailingTypes();
  }, []);

  const handleRailingSelect = (railingId: number) => {
    onSelect(railingId);
  };

  return (
    <div className="grid grid-cols-2 gap-2 w-full content-start flex-1">
      {loading ? (
        Array.from({ length: 6 }).map((_, index) => (
          <motion.div 
            key={index} 
            className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col min-h-0"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <div className="relative flex-1 w-full bg-gray-200 animate-pulse min-h-0"></div>
            <div className="p-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="w-5 h-5 rounded-full border-2 border-gray-200 bg-gray-100"></div>
              </div>
            </div>
          </motion.div>
        ))
      ) : (
        railingTypes.map((railing, index) => (
          <motion.div
            key={railing.id}
            onClick={() => handleRailingSelect(railing.id)}
            className={`bg-[#f5f5f5] border rounded-lg cursor-pointer transition-all duration-300 overflow-hidden flex flex-col min-h-0 ${
              selectedRailingType === railing.id
                ? 'border-rail-light-blue shadow-sm'
                : 'border-gray-200 hover:border-rail-light-blue'
            }`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
          >
            <div className="relative flex-1 w-full min-h-0">
              <Image
                src={railing.image}
                alt={railing.name}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 30vw, 23vw"
              />
            </div>
            <div className="p-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-xs">{railing.name}</h4>
                <span
                  className={`flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full border-2 text-[10px] ${
                    selectedRailingType === railing.id
                      ? 'bg-rail-light-blue border-rail-light-blue text-white'
                      : 'border-gray-300 text-gray-400'
                  }`}
                >
                  {selectedRailingType === railing.id ? '✓' : ''}
                </span>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}
