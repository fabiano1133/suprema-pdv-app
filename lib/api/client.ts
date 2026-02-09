/** Base URL da API backend. Ex.: http://localhost:3000 */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "";
}

export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base.replace(/\/$/, "")}${p}` : p;
}

/** Payload de erro retornado pelo backend. */
export interface ApiErrorPayload {
  statusCode: number;
  message: string;
  error?: string;
  timestamp?: string;
  path?: string;
}

/**
 * Trata resposta de erro da API e lança Error com a mensagem do backend.
 * Tenta payload.message, payload.error, body como texto; usa fallbackMessage se nada vier.
 */
export async function throwApiError(res: Response, fallbackMessage: string): Promise<never> {
  let message = fallbackMessage;
  const contentType = res.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body: ApiErrorPayload & { error?: string } = await res.json();
      if (body?.message && typeof body.message === "string") message = body.message;
      else if (body?.error && typeof body.error === "string") message = body.error;
    } else {
      const text = await res.text();
      if (text?.trim()) message = text.trim();
    }
  } catch {
    // mantém fallbackMessage
  }
  throw new Error(message);
}
