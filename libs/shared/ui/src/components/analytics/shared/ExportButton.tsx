import React, { useState } from 'react';
import { Download, FileText, Table, Image } from 'lucide-react';

interface ExportButtonProps {
  data: any;
  filename?: string;
  formats?: ('csv' | 'json' | 'pdf' | 'png')[];
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename = 'export',
  formats = ['csv', 'json', 'pdf'],
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const exportData = (format: string) => {
    switch (format) {
      case 'csv':
        // CSV export logic
        console.log('Exporting as CSV');
        break;
      case 'json':
        // JSON export logic
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        a.click();
        break;
      case 'pdf':
        // PDF export logic
        console.log('Exporting as PDF');
        break;
      case 'png':
        // PNG export logic
        console.log('Exporting as PNG');
        break;
    }
    setIsOpen(false);
  };

  const formatIcons = {
    csv: Table,
    json: FileText,
    pdf: FileText,
    png: Image,
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Download className="w-4 h-4 mr-2" />
        Export
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
            <div className="p-2">
              {formats.map((format) => {
                const Icon = formatIcons[format];
                return (
                  <button
                    key={format}
                    onClick={() => exportData(format)}
                    className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Icon className="w-4 h-4 mr-2 text-gray-400" />
                    Export as {format.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};