/**
 * Detecta Safari (desktop e iOS) e dispositivos móveis/tablets.
 * Nesses ambientes, PDF em iframe via blob URL costuma falhar; abrir em nova aba funciona.
 */
function shouldOpenPdfInNewTab(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isSafari =
    (ua.includes("Safari") && !ua.includes("Chrome")) ||
    /^((?!chrome|android).)*safari/i.test(ua) ||
    (ua.includes("AppleWebKit") && ua.includes("Mobile"));
  const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  return isSafari || isMobileOrTablet;
}

/**
 * Garante que o Blob tenha type application/pdf (alguns navegadores/APIs não definem).
 */
function ensurePdfBlob(blob: Blob): Blob {
  if (blob.type && blob.type.startsWith("application/pdf")) return blob;
  return new Blob([blob], { type: "application/pdf" });
}

export type OpenPdfResult = "printed" | "new_tab" | "blocked";

/**
 * Abre o PDF para impressão. Em Safari e mobile/tablet abre em nova aba (compatibilidade);
 * em desktop Chrome/Firefox/Edge usa iframe oculto e dispara o diálogo de impressão.
 * @returns "printed" = diálogo de impressão aberto no iframe; "new_tab" = PDF aberto em nova aba (imprimir pela aba); "blocked" = popup bloqueado ou erro.
 */
export function openPdfForPrint(blob: Blob): OpenPdfResult {
  const pdfBlob = ensurePdfBlob(blob);
  const url = URL.createObjectURL(pdfBlob);

  if (shouldOpenPdfInNewTab()) {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) {
      URL.revokeObjectURL(url);
      return "blocked";
    }
    // Não revogar URL aqui: a nova aba ainda usa o blob. Revogar após tempo longo para liberar memória quando o usuário fechar a aba.
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }, 10 * 60 * 1000);
    return "new_tab";
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "PDF para impressão");
  iframe.style.position = "fixed";
  iframe.style.inset = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  function cleanup(): void {
    try {
      if (iframe.parentNode) document.body.removeChild(iframe);
    } catch {
      // ignore
    }
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }

    const doPrint = (): void => {
      try {
        win.print();
      } catch {
        cleanup();
      }
    };

    let cleaned = false;
    const doCleanup = (): void => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(fallbackId);
      win.removeEventListener("afterprint", doCleanup);
      cleanup();
    };

    // Fallback: limpar após 60s caso afterprint não dispare (alguns navegadores/OS)
    const fallbackId = setTimeout(cleanup, 60000);
    win.addEventListener("afterprint", doCleanup);

    // Pequeno atraso para o PDF terminar de renderizar antes de abrir o diálogo de impressão
    setTimeout(doPrint, 300);
  };

  iframe.onerror = () => cleanup();
  iframe.src = url;
  return "printed";
}
