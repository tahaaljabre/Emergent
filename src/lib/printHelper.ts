/**
 * Robust Cross-Platform Printing Utility
 * Handles standard printing, sandboxed iframe printing, popup window printing,
 * and graceful fallback to PDF/dialogs.
 */

export interface PrintOptions {
  title?: string;
  isRTL?: boolean;
  lang?: string;
  onSuccess?: () => void;
  onError?: (err: any) => void;
  onFallback?: () => void;
}

export function printHtmlContent(htmlContent: string, options: PrintOptions = {}) {
  const { title = 'طباعة', isRTL = true, lang = 'ar', onSuccess, onError } = options;

  // Collect all active stylesheets and style tags
  const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n');

  const fullHtml = `
    <!DOCTYPE html>
    <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${lang}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
        ${styleTags}
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            margin: 0 !important;
            padding: 10px !important;
            font-size: 13px !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;

  // Strategy 1: Try Popout Window first if user triggered it via click
  let printWindow: Window | null = null;
  try {
    printWindow = window.open('', '_blank', 'width=900,height=800,menubar=no,toolbar=no,location=no,status=no');
  } catch (e) {
    printWindow = null;
  }

  if (printWindow && !printWindow.closed) {
    try {
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();

      setTimeout(() => {
        try {
          printWindow?.focus();
          printWindow?.print();
          onSuccess?.();
        } catch (err) {
          console.warn('Print window print call failed:', err);
        }
      }, 400);
      return true;
    } catch (e) {
      console.warn('Popout print failed:', e);
    }
  }

  // Strategy 2: Invisible iframe with sandbox safety
  try {
    const frame = document.createElement('iframe');
    frame.setAttribute('style', 'position:fixed;top:-10000px;left:-10000px;width:1000px;height:1000px;border:none;opacity:0;');
    frame.setAttribute('id', 'app-print-frame');
    document.body.appendChild(frame);

    const doc = frame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();

      setTimeout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          onSuccess?.();
        } catch (frameErr) {
          console.warn('Iframe print error, falling back to window.print():', frameErr);
          window.print();
        } finally {
          setTimeout(() => {
            try {
              document.body.removeChild(frame);
            } catch {}
          }, 3000);
        }
      }, 500);
      return true;
    }
  } catch (err) {
    console.warn('Print iframe creation error:', err);
  }

  // Strategy 3: Direct window.print() fallback
  try {
    window.print();
    onSuccess?.();
    return true;
  } catch (err) {
    onError?.(err);
    return false;
  }
}
