// ============================================================
// hooks/useSendNUI.ts
// Envoie des données au Lua client via fetch NUI
// ============================================================

// Étend Window pour que TS connaisse GetParentResourceName
declare global {
  interface Window {
    GetParentResourceName?: () => string
  }
}

function getResourceName(): string {
  if (typeof window.GetParentResourceName === 'function') {
    return window.GetParentResourceName()
  }
  return 'k_chat'
}

export function useSendNUI() {
  const send = (endpoint: string, data: Record<string, unknown> = {}): Promise<unknown> => {
    return fetch(`https://${getResourceName()}/${endpoint}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    })
      .then(r => r.json())
      .catch(() => null)
  }

  return { send }
}
