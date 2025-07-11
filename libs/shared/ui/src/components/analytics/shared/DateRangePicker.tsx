import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

interface DateRangePickerProps {
  value: {
    start: Date;
    end: Date;
  };
  onChange: (range: { start: Date; end: Date }) => void;
  presets?: Array<{
    label: string;
    value: { start: Date; end: Date };
  }>;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  presets = [
    {
      label: 'Last 7 days',
      value: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    },
    {
      label: 'Last 30 days',
      value: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    },
    {
      label: 'Last 90 days',
      value: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    },
    {
      label: 'This year',
      value: {
        start: new Date(new Date().getFullYear(), 0, 1),
        end: new Date(),
      },
    },
  ],
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatDateRange = () => {
    return `${format(value.start, 'MMM d, yyyy')} - ${format(value.end, 'MMM d, yyyy')}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Calendar className="w-5 h-5 text-gray-400 mr-2" />
        <span className="text-sm font-medium text-gray-700">{formatDateRange()}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-20">
            <div className="p-2">
              {presets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onChange(preset.value);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  {preset.label}
                </button>
              ))}
              <div className="mt-2 pt-2 border-t">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Custom range...
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};