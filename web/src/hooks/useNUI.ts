// ============================================================
// hooks/useNUI.ts
// Écoute window.addEventListener('message') envoyé par le Lua client
// ============================================================
import { useEffect } from 'react'
import { useChatStore } from '../store/chatStore'

// Payload brut envoyé par SendNUIMessage côté Lua
interface NUIPayload {
  action?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?:   any
}

export function useNUI(): void {
  const { dispatch } = useChatStore()

  useEffect(() => {
    function handler(event: MessageEvent<NUIPayload>): void {
      const { action, data } = event.data ?? {}
      if (!action) return

      switch (action) {

       case 'openChat':
  dispatch({ type: 'OPEN_CHAT' })
  // Laisser React re-render + NUI prendre le focus avant de focus l'input
  setTimeout(() => {
    const input = document.querySelector<HTMLInputElement>('input[class*="input"]')
    input?.focus()
  }, 50)
  break

        case 'closeChat':
          dispatch({ type: 'CLOSE_CHAT' })
          break

        case 'setPlayerInfo':
          dispatch({
            type: 'SET_ME',
            data: {
              name:     data.name     as string,
              role:     data.role     as string,
              color:    data.color    as string,
              initials: (data.initials as string | undefined)
                ?? (data.name as string)?.slice(0, 2).toUpperCase(),
            },
          })
          break

        case 'receiveMessage':
          dispatch({
            type:    'RECEIVE_MESSAGE',
            channel: data.channel === 'staff' ? 'staff' : 'global',
            author:  data.author  as string,
            text:    data.message as string,
          })
          break

        case 'receivePm':
          dispatch({
            type:     'RECEIVE_PM',
            fromId:   String(data.fromId),
            fromName: data.fromName as string,
            text:     data.message  as string,
          })
          break

        case 'updatePlayerCount':
          dispatch({
            type:    'UPDATE_PLAYER_COUNT',
            current: data.current as number,
            max:     data.max     as number,
          })
          break

        case 'updateStaffCount':
          dispatch({
            type:  'UPDATE_STAFF_COUNT',
            count: data.count as number,
          })
          break

        case 'updatePmContacts':
        case 'addPmContact': {
          const contacts = Array.isArray(data) ? data : [data]
          dispatch({ type: 'UPDATE_PM_CONTACTS', contacts })
          break
        }

        default:
          break
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [dispatch])
}
