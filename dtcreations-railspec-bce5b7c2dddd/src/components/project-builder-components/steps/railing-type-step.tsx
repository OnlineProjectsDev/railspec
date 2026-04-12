"use client";

import { Plus } from "lucide-react";
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
    <div className="grid grid-cols-2 grid-rows-3 gap-4 w-full h-full">
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
        railingTypes.map((railing) => (
          <div 
            key={railing.id} 
            onClick={() => handleRailingSelect(railing.id)}
            className={`bg-[#f5f5f5] border rounded-lg cursor-pointer transition-all duration-500 overflow-hidden group flex flex-col min-h-0 ${
              selectedRailingType === railing.id 
                ? 'border-rail-light-blue border' 
                : 'border-gray-200 hover:border-rail-light-blue'
            }`}
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
                <div 
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedRailingType === railing.id 
                      ? 'bg-rail-light-blue border-rail-light-blue' 
                      : 'border-gray-300 group-hover:bg-rail-light-blue group-hover:border-rail-light-blue'
                  }`}
                >
                  <Plus size={12} className={`transition-colors ${
                    selectedRailingType === railing.id ? 'text-white' : 'text-gray-400 group-hover:text-white'
                  }`} />
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
