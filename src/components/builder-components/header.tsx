"use client";

import { RotateCcw, Home, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Step {
  id: number;
  name: string;
  key: string;
}

interface SelectedData {
  railingType: number | null;
  shape: number | null;
  size: number | null;
  mountingType: number | null;
  projectName?: string;
  dueDate?: string;
}

interface HeaderProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (stepId: number) => void;
  onReset: () => void;
  selectedData: SelectedData;
  viewMode: '2d' | '3d';
  onViewModeChange: (mode: '2d' | '3d') => void;
}

export default function Header({ steps, currentStep, onStepClick, onReset, selectedData, viewMode, onViewModeChange }: HeaderProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showHomeDialog, setShowHomeDialog] = useState(false);
  const router = useRouter();

  const handleResetConfirm = () => {
    setIsSpinning(true);
    onReset();
    setShowResetDialog(false);
    setTimeout(() => setIsSpinning(false), 300);
  };

  const handleHomeConfirm = () => {
    router.push("/projects");
  };

  // Check if user can navigate to a specific step
  const canNavigateToStep = (targetStepId: number): boolean => {
    // Can always go back to previous steps
    if (targetStepId <= currentStep) {
      return true;
    }
    
    // For forward navigation, check if all previous steps are completed
    for (let stepId = 1; stepId < targetStepId; stepId++) {
      switch (stepId) {
        case 1:
          if (selectedData.railingType === null) return false;
          break;
        case 2:
          if (selectedData.mountingType === null) return false;
          break;
        case 3:
          if (selectedData.shape === null) return false;
          break;
        case 4:
          if (selectedData.size === null) return false;
          break;
      }
    }
    return true;
  };

  const handleStepClick = (stepId: number) => {
    if (canNavigateToStep(stepId)) {
      onStepClick(stepId);
    }
  };

  return (
    <div className="px-4 py-3 flex w-full justify-between items-center mx-auto bg-white rounded-[10px]">
      <div className="flex gap-8 items-center w-full justify-between">
        <div className="flex gap-4 items-center">
          <AlertDialog open={showHomeDialog} onOpenChange={setShowHomeDialog}>
            <Tooltip>
              <AlertDialogTrigger asChild>
                <TooltipTrigger asChild>
                  <button 
                  suppressHydrationWarning
                    className="bg-rail-light-blue p-[9px] text-white rounded-[5px] flex items-center justify-center hover:bg-[#333333] transition-colors"
                    aria-label="Go to dashboard"
                  >
                    <Home size={14} />
                  </button>
                </TooltipTrigger>
              </AlertDialogTrigger>
              <TooltipContent>
                <p>Go to Dashboard</p>
              </TooltipContent>
            </Tooltip>
            <AlertDialogContent className="shadow-none !max-w-sm w-1/2 flex flex-col gap-6">
              <AlertDialogHeader>
                <AlertDialogTitle>Return to Dashboard?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to go back to the dashboard? Any unsaved changes will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-xs bg-[#f5f5f5] hover:bg-rail-light-blue/30 border-none cursor-pointer">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleHomeConfirm} className="bg-rail-light-blue cursor-pointer hover:bg-[#333] text-xs group">
                  <span className="flex items-center justify-center">
                    Continue
                    <ArrowRight size={16} className="max-w-0 opacity-0 -translate-x-2 group-hover:max-w-[16px] group-hover:ml-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                  </span>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <ul className="flex text-xs font-sans">
            {steps.map((step, index) => (
              <li 
                key={step.id}
                className={`${index < steps.length - 1 ? 'border-r border-l px-4' : 'pl-4'} ${
                  index > 0 && index < steps.length - 1 ? 'px-4' : ''
                }`}
              >
                <button
                  suppressHydrationWarning
                  onClick={() => handleStepClick(step.id)}
                  disabled={!canNavigateToStep(step.id)}
                  className={`transition-colors ${
                    currentStep === step.id 
                      ? 'text-[#333333] font-bold' 
                      : canNavigateToStep(step.id)
                      ? 'text-gray-700 hover:text-rail-light-blue cursor-pointer'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {step.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-2 items-center">
          <div className="bg-[#f5f5f5] rounded-[5px] p-1 relative overflow-hidden">
            <div className="flex relative">
              {/* Sliding background indicator */}
              <span 
                className={`absolute inset-0 w-1/2 bg-rail-light-blue rounded-[4px] transition-transform duration-300 ease-in-out ${
                  viewMode === '3d' ? 'translate-x-full' : 'translate-x-0'
                }`}
              />
              <button
              suppressHydrationWarning
                onClick={() => onViewModeChange('2d')}
                className={`px-3 py-1 text-[10px] leading-4 rounded-[4px] transition-colors duration-300 relative z-10 ${
                  viewMode === '2d'
                    ? 'text-white font-semibold'
                    : 'text-gray-700 hover:text-rail-light-blue'
                }`}
              >
                2D
              </button>
              <button
              suppressContentEditableWarning
                onClick={() => onViewModeChange('3d')}
                className={`px-3 py-1 text-[10px] leading-4 rounded-[4px] transition-colors duration-300 relative z-10 ${
                  viewMode === '3d'
                    ? 'text-white font-semibold'
                    : 'text-gray-700 hover:text-rail-light-blue'
                }`}
              >
                3D
              </button>
            </div>
          </div>
          <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
            <Tooltip>
              <AlertDialogTrigger asChild>
                <TooltipTrigger asChild>
                  <button 
                  suppressHydrationWarning
                    className="bg-rail-light-blue p-[9px] text-white rounded-[5px] flex items-center justify-center hover:bg-[#333333] transition-colors"
                    aria-label="Reset design"
                  >
                    <RotateCcw size={14} className={`transition-transform duration-300 ${isSpinning ? 'rotate-360' : 'rotate-0'}`} />
                  </button>
                </TooltipTrigger>
              </AlertDialogTrigger>
              <TooltipContent>
                <p>Reset Design</p>
              </TooltipContent>
            </Tooltip>
            <AlertDialogContent className="shadow-none !max-w-sm w-1/2 flex flex-col gap-6">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Design?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to reset your design? This will clear all your selections and start over.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-xs bg-[#f5f5f5] border-none hover:bg-rail-light-blue/30 cursor-pointer shadow-none">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetConfirm} className="bg-rail-light-blue cursor-pointer hover:bg-[#333] text-xs group">
                  <span className="flex items-center justify-center">
                    Continue
                    <ArrowRight size={16} className="max-w-0 opacity-0 -translate-x-2 group-hover:max-w-[16px] group-hover:ml-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                  </span>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}