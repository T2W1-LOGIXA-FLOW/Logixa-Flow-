'use client';

import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface BlogPDFExportProps {
  title: string;
  htmlContent: string;
  publishedAt?: string;
}

export default function BlogPDFExport({ title, htmlContent, publishedAt }: BlogPDFExportProps) {
  const handleExportPDF = async () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to export PDF');
        return;
      }

      const htmlDoc = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: #1f2937;
                background: white;
                padding: 40px;
              }
              .header {
                margin-bottom: 30px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 20px;
              }
              h1 {
                font-size: 28px;
                margin-bottom: 10px;
                color: #111827;
              }
              .meta {
                font-size: 13px;
                color: #6b7280;
              }
              .content {
                margin-top: 30px;
                font-size: 15px;
              }
              .content p {
                margin-bottom: 15px;
              }
              .content h2 {
                font-size: 20px;
                margin: 25px 0 15px 0;
                color: #1f2937;
              }
              .content h3 {
                font-size: 18px;
                margin: 20px 0 10px 0;
                color: #374151;
              }
              .content ul, .content ol {
                margin: 15px 0 15px 30px;
              }
              .content li {
                margin-bottom: 8px;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #9ca3af;
                text-align: center;
              }
              @media print {
                body {
                  padding: 20px;
                }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${title}</h1>
              <div class="meta">
                <p><strong>Published:</strong> ${publishedAt ? new Date(publishedAt).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Source:</strong> Logixa Flow - Supply Chain Intelligence Platform</p>
                <p><strong>Exported:</strong> ${new Date().toLocaleString()}</p>
              </div>
            </div>
            <div class="content">
              ${htmlContent}
            </div>
            <div class="footer">
              <p>This document was exported from Logixa Flow</p>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(htmlDoc);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
        toast.success('Export ready! Choose "Save as PDF" in the print dialog.');
      }, 250);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleExportPDF}
      className="px-4 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg hover:bg-orange-500/20 transition text-sm font-medium"
      title="Export article as PDF"
    >
      📥 Export as PDF
    </motion.button>
  );
}
