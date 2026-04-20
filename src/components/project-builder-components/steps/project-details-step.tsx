import { useState } from "react";
import { FileText, User, Calendar as CalendarIcon, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProjectDetailsStepProps {
  selectedData: {
    projectName?: string;
    projectReference?: string;
    clientName?: string;
    company?: string;
    dueDate?: string;
    notes?: string;
  };
  setSelectedData: (data: {
    projectName?: string;
    projectReference?: string;
    clientName?: string;
    company?: string;
    dueDate?: string;
    notes?: string;
  }) => void;
}

export default function ProjectDetailsStep({
  selectedData,
  setSelectedData
}: ProjectDetailsStepProps) {
  const [formData, setFormData] = useState({
    projectName: selectedData.projectName || "",
    projectReference: selectedData.projectReference || "",
    clientName: selectedData.clientName || "",
    company: selectedData.company || "",
    dueDate: selectedData.dueDate || "",
    notes: selectedData.notes || ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSelectedData({ ...selectedData, [name]: value });
  };

  return (
    <ScrollArea className="flex-1 min-h-0 pr-2">
        <div className="space-y-4">
          {/* Project Information */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText size={14} className="text-rail-light-blue" />
              Project Information
            </h3>
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="projectName" className="text-[11px] font-semibold text-gray-700">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="projectName"
                  name="projectName"
                  type="text"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  placeholder="e.g., Marina Village Deck"
                  className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-md outline-none"
                />
              </div>
            </div>
          </div>

          {/* Client Information */
          <div>
            <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <User size={14} className="text-rail-light-blue" />
              Client Information
            </h3>
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="clientName" className="text-[11px] font-semibold text-gray-700">
                  Client Name
                </label>
                <input
                  id="clientName"
                  name="clientName"
                  type="text"
                  value={formData.clientName}
                  onChange={handleInputChange}
                  placeholder="e.g., John Smith"
                  className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-md outline-none"
                />
              </div>
            </div>
          </div>

          {/* Timeline */
          <div>
            <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <CalendarIcon size={14} className="text-rail-light-blue" />
              Timeline
            </h3>
            <div className="flex flex-col gap-1">
              <label htmlFor="dueDate" className="text-[11px] font-semibold text-gray-700">
                Required By Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md outline-none text-left cursor-pointer",
                      !formData.dueDate && "text-gray-400"
                    )}
                  >
                    {formData.dueDate ? format(new Date(formData.dueDate), "PPP") : "Pick a date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate ? new Date(formData.dueDate) : undefined}
                    onSelect={(date) => {
                      const value = date ? format(date, "yyyy-MM-dd") : "";
                      setFormData(prev => ({ ...prev, dueDate: value }));
                      setSelectedData({ ...selectedData, dueDate: value });
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <MessageSquare size={14} className="text-rail-light-blue" />
              Additional Notes
            </h3>
            <div className="flex flex-col gap-1">
              <label htmlFor="notes" className="text-[11px] font-semibold text-gray-700">
                Special Requirements
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any special requirements, installation notes, or other details..."
                rows={3}
                className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-md outline-none resize-none"
              />
            </div>
          </div>
        </div>
      </div>
  );
}
