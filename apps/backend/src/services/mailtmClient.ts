/**
 * mailtmClient.ts
 * Low-level HTTP client for the Mail.tm REST API.
 * Docs: https://docs.mail.tm/
 */

const BASE = "https://api.mail.tm"

async function request<T>(
  path: string,
  options: RequestInit = {},
  retries = 2
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    })

    if (res.status === 429 && attempt < retries) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "3", 10)
      const waitMs = Math.min(retryAfter * 1000, 10000)
      console.warn(`[Mail.tm] 429 on ${path}, retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`)
      await new Promise((r) => setTimeout(r, waitMs))
      continue
    }

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Mail.tm ${options.method ?? "GET"} ${path} → ${res.status}: ${body}`)
    }

    // 204 No Content
    if (res.status === 204) return {} as T
    return res.json() as Promise<T>
  }

  throw new Error(`Mail.tm ${options.method ?? "GET"} ${path} → exhausted retries`)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TmDomain {
  id: string
  domain: string
  isActive: boolean
}

export interface TmAccount {
  id: string
  address: string
}

export interface TmMessage {
  id: string
  from: { address: string; name: string }
  subject: string
  intro: string
  hasAttachments: boolean
  seen: boolean
  createdAt: string
}

export interface TmMessageFull extends TmMessage {
  text: string
  html: string[]
  attachments: TmAttachment[]
}

export interface TmAttachment {
  id: string
  filename: string
  contentType: string
  size: number
  downloadUrl: string
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getDomains(): Promise<TmDomain[]> {
  const data = await request<{ "hydra:member": TmDomain[] }>("/domains")
  return data["hydra:member"].filter((d) => d.isActive)
}

export async function createAccount(address: string, password: string): Promise<TmAccount> {
  return request<TmAccount>("/accounts", {
    method: "POST",
    body: JSON.stringify({ address, password }),
  })
}

export async function getToken(address: string, password: string): Promise<string> {
  const data = await request<{ token: string }>("/token", {
    method: "POST",
    body: JSON.stringify({ address, password }),
  })
  return data.token
}

export async function deleteAccount(accountId: string, token: string): Promise<void> {
  await request(`/accounts/${accountId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getMessages(token: string): Promise<TmMessage[]> {
  const data = await request<{ "hydra:member": TmMessage[] }>("/messages", {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data["hydra:member"]
}

export async function getMessageById(messageId: string, token: string): Promise<TmMessageFull> {
  return request<TmMessageFull>(`/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function deleteMessage(messageId: string, token: string): Promise<void> {
  await request(`/messages/${messageId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
}
