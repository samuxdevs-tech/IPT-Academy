export function exportToCsv(filename: string, headers: string[], rows: (string | number | boolean)[][]) {
  const processCell = (cell: string | number | boolean): string => {
    if (cell === null || cell === undefined) return '';
    const str = String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(processCell).join(';'),
    ...rows.map(row => row.map(processCell).join(';'))
  ].join('\r\n');

  // Agregar BOM UTF-8 (\uFEFF) para que Microsoft Excel en Windows abra las tildes y caracteres especiales de inmediato
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPrintablePdf(title: string, subtitle: string, headers: string[], rows: (string | number | boolean)[][], metadata?: { [key: string]: string }) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor autorice la apertura de ventanas emergentes para generar el documento imprimible/PDF.');
    return;
  }

  const metaHtml = metadata
    ? `<div style="margin-bottom: 20px; padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 13px; line-height: 1.6; border: 1px solid #e2e8f0;">
        ${Object.entries(metadata).map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`).join('')}
       </div>`
    : '';

  const tableHeaders = headers.map(h => `<th style="padding: 10px 12px; border: 1px solid #cbd5e1; background: #f1f5f9; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase;">${h}</th>`).join('');
  const tableRows = rows.map(r => `<tr>${r.map(c => `<td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px; color: #1e293b;">${c}</td>`).join('')}</tr>`).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} — IPT Academy</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 24px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #065fd4; padding-bottom: 14px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
          .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
          .badge { background: #065fd4; color: white; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${title}</h1>
            <div class="subtitle">${subtitle}</div>
          </div>
          <div>
            <span class="badge">IPT ACADEMY · OPERATORS</span>
          </div>
        </div>
        ${metaHtml}
        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="footer">
          <span>Generado oficialmente por IPT Academy (Ivan Perez Tech)</span>
          <span>Fecha y Hora UTC: ${new Date().toISOString()}</span>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
