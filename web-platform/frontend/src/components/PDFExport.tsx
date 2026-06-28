"use client";

export interface PDFOptions {
  filename?: string;
  title?: string;
  author?: string;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
}

export function exportHTMLToPDF(html: string, options: PDFOptions = {}) {
  const {
    title = "Document",
    marginTop = 10,
    marginBottom = 10,
    marginLeft = 10,
    marginRight = 10,
  } = options;

  const printWindow = window.open("", "", "height=600,width=800");
  if (!printWindow) return;

  const doc = printWindow.document;
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu';
          font-size: 14px;
          line-height: 1.6;
          color: #333;
          margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
        }
        h1 { font-size: 28px; font-weight: bold; margin-bottom: 20px; }
        h2 { font-size: 20px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; }
        h3 { font-size: 16px; font-weight: bold; margin-top: 15px; margin-bottom: 8px; }
        p { margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        ul, ol { margin-left: 20px; margin-bottom: 10px; }
        li { margin-bottom: 5px; }
        @page { margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm; }
      </style>
    </head>
    <body>
      ${html}
      <script>
        window.onload = () => {
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  doc.close();
}

export function exportTableToPDF(
  tableElement: HTMLTableElement,
  options: PDFOptions = {}
) {
  const { filename = "table.pdf", ...pdfOptions } = options;
  const html = tableElement.outerHTML;
  exportHTMLToPDF(html, { filename, ...pdfOptions });
}

export function exportSectionToPDF(
  sectionElement: HTMLElement,
  options: PDFOptions = {}
) {
  const { filename = "section.pdf", ...pdfOptions } = options;
  const html = sectionElement.innerHTML;
  exportHTMLToPDF(html, { filename, ...pdfOptions });
}

export function generatePDFTemplate({
  title,
  subtitle,
  content,
  footer,
}: {
  title: string;
  subtitle?: string;
  content: string;
  footer?: string;
}): string {
  return `
    <div style="padding: 20px;">
      <h1 style="text-align: center; margin-bottom: 10px;">${title}</h1>
      ${subtitle ? `<p style="text-align: center; color: #666; margin-bottom: 30px;">${subtitle}</p>` : ""}
      <hr style="margin: 20px 0; border: 1px solid #ddd;" />
      <div>${content}</div>
      ${footer ? `<hr style="margin: 20px 0; border: 1px solid #ddd;" /><p style="text-align: center; color: #999; font-size: 12px;">${footer}</p>` : ""}
    </div>
  `;
}

export function exportArticleToPDF({
  title,
  author,
  publishedAt,
  content,
  fileName,
}: {
  title: string;
  author: string;
  publishedAt: Date;
  content: string;
  fileName?: string;
}) {
  const html = generatePDFTemplate({
    title,
    subtitle: `By ${author} | Published: ${publishedAt.toLocaleDateString()}`,
    content,
    footer: `Generated on ${new Date().toLocaleDateString()} | Logixa Flow`,
  });

  exportHTMLToPDF(html, {
    filename: fileName || `${title.replace(/\s+/g, "-")}.pdf`,
    title,
    author,
  });
}

export function convertCSVToPDF(
  csvData: string,
  fileName: string = "data.pdf"
) {
  const lines = csvData.trim().split("\n");
  const headers = lines[0].split(",");
  const rows = lines.slice(1).map((line) => line.split(","));

  const html = `
    <table>
      <thead>
        <tr>
          ${headers.map((h) => `<th>${h}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `;

  exportHTMLToPDF(html, { filename: fileName });
}
