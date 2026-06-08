// ============================================================
// store/chatStore.tsx        ← .tsx obligatoire (contient du tsx)
// État global via useReducer + Context
// ============================================================
import React, { createContext, useContext, useReducer } from 'react'

// ── Types exportés ──────────────────────────────────────────────────────────
export type TabId = 'global' | 'staff' | 'pm'

export interface ChatMessage {
  id:     string
  author: string
  text:   string
  time:   string
  isNew?: boolean
}

export interface PmMessage {
  id:     string
  author: string
  text:   string
  time:   string
  mine:   boolean
}

export interface PmContact {
  id:          string
  name:        string
  color:       string
  initials:    string
  msgs:        PmMessage[]
  unread:      number
  lastPreview: string | null
}

export interface MeInfo {
  name:     string
  role:     string
  color:    string
  initials: string
}

export interface ChatState {
  visible:     boolean
  activeTab:   TabId
  messages:    Record<'global' | 'staff', ChatMessage[]>
  notifs:      Record<TabId, number>
  me:          MeInfo
  playerCount: [number, number]
  staffCount:  number
  pmContacts:  PmContact[]
  activePmId:  string | null
}

export type Action =
  | { type: 'OPEN_CHAT' }
  | { type: 'CLOSE_CHAT' }
  | { type: 'SWITCH_TAB';          tab: TabId }
  | { type: 'RECEIVE_MESSAGE';     channel: 'global' | 'staff'; author: string; text: string }
  | { type: 'SEND_MESSAGE';        channel: 'global' | 'staff'; text: string }
  | { type: 'SET_ME';              data: Partial<MeInfo> }
  | { type: 'UPDATE_PLAYER_COUNT'; current: number; max: number }
  | { type: 'UPDATE_STAFF_COUNT';  count: number }
  | { type: 'RECEIVE_PM';          fromId: string; fromName: string; text: string }
  | { type: 'SEND_PM';             text: string }
  | { type: 'OPEN_CONVERSATION';   id: string }
  | { type: 'UPDATE_PM_CONTACTS';  contacts: { id: string | number; name: string }[] }

interface ChatContextValue {
  state:    ChatState
  dispatch: React.Dispatch<Action>
}

// ── Color pool ──────────────────────────────────────────────────────────────
const COLOR_POOL: string[] = [
  '#38bdf8', '#fb923c', '#a78bfa', '#34d399',
  '#f472b6', '#facc15', '#60a5fa', '#4ade80',
  '#e879f9', '#f87171', '#94a3b8', '#fbbf24',
]
const playerColors = new Map<string, string>()
let colorIdx = 0

export function colorFor(name: string): string {
  if (!playerColors.has(name)) {
    playerColors.set(name, COLOR_POOL[colorIdx++ % COLOR_POOL.length])
  }
  return playerColors.get(name)!
}

export function makeInitials(name: string): string {
  return (name || '??').slice(0, 2).toUpperCase()
}

function ts(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function uid(): string {
  return Math.random().toString(36).slice(2)
}

// ── État initial ────────────────────────────────────────────────────────────
const initialState: ChatState = {
  visible:     false,
  activeTab:   'global',
  messages:    { global: [], staff: [] },
  notifs:      { global: 0, staff: 0, pm: 0 },
  me: {
    name:     'Joueur',
    role:     'Joueur',
    color:    '#4ade80',
    initials: 'JO',
  },
  playerCount: [0, 0],
  staffCount:  0,
  pmContacts:  [],
  activePmId:  null,
}

const MAX_MSGS = 200

// ── Reducer ─────────────────────────────────────────────────────────────────
function reducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {

    case 'OPEN_CHAT':
      return { ...state, visible: true }

    case 'CLOSE_CHAT':
      return { ...state, visible: false }

    case 'SWITCH_TAB':
      return {
        ...state,
        activeTab: action.tab,
        notifs:    { ...state.notifs, [action.tab]: 0 },
      }

    case 'RECEIVE_MESSAGE': {
      const ch = action.channel
      const msg: ChatMessage = {
        id: uid(), author: action.author, text: action.text, time: ts(), isNew: true,
      }
      const next   = [...state.messages[ch], msg].slice(-MAX_MSGS)
      const notifs = ch !== state.activeTab
        ? { ...state.notifs, [ch]: (state.notifs[ch] || 0) + 1 }
        : state.notifs
      return { ...state, messages: { ...state.messages, [ch]: next }, notifs }
    }

    case 'SEND_MESSAGE': {
      const msg: ChatMessage = {
        id: uid(), author: state.me.name, text: action.text, time: ts(), isNew: false,
      }
      const next = [...state.messages[action.channel], msg].slice(-MAX_MSGS)
      return { ...state, messages: { ...state.messages, [action.channel]: next } }
    }

    case 'SET_ME':
      return { ...state, me: { ...state.me, ...action.data } }

    case 'UPDATE_PLAYER_COUNT':
      return { ...state, playerCount: [action.current, action.max] }

    case 'UPDATE_STAFF_COUNT':
      return { ...state, staffCount: action.count }

    case 'UPDATE_PM_CONTACTS': {
      const contacts = [...state.pmContacts]
      action.contacts.forEach(c => {
        const id = String(c.id)
        if (!contacts.find(x => x.id === id)) {
          contacts.unshift({
            id,
            name:        c.name,
            color:       colorFor(c.name),
            initials:    makeInitials(c.name),
            msgs:        [],
            unread:      0,
            lastPreview: null,
          })
        }
      })
      return { ...state, pmContacts: contacts }
    }

    case 'RECEIVE_PM': {
      const id     = String(action.fromId)
      let contacts = [...state.pmContacts]
      let contact  = contacts.find(c => c.id === id)

      if (!contact) {
        contact = {
          id,
          name:        action.fromName,
          color:       colorFor(action.fromName),
          initials:    makeInitials(action.fromName),
          msgs:        [],
          unread:      0,
          lastPreview: null,
        }
        contacts = [contact, ...contacts]
      }

      const pmMsg: PmMessage = {
        id: uid(), author: action.fromName, text: action.text, time: ts(), mine: false,
      }
      const isActive      = state.activePmId === id
      const updated: PmContact = {
        ...contact,
        msgs:        [...contact.msgs, pmMsg],
        lastPreview: action.text,
        unread:      isActive ? 0 : contact.unread + 1,
      }
      const updatedContacts = contacts.map(c => c.id === id ? updated : c)
      const notifs = (!isActive || state.activeTab !== 'pm')
        ? { ...state.notifs, pm: (state.notifs.pm || 0) + 1 }
        : state.notifs

      return { ...state, pmContacts: updatedContacts, notifs }
    }

    case 'SEND_PM': {
      if (!state.activePmId) return state
      const id       = state.activePmId
      const pmMsg: PmMessage = {
        id: uid(), author: state.me.name, text: action.text, time: ts(), mine: true,
      }
      const updatedContacts = state.pmContacts.map(c =>
        c.id === id ? { ...c, msgs: [...c.msgs, pmMsg], lastPreview: action.text } : c
      )
      return { ...state, pmContacts: updatedContacts }
    }

    case 'OPEN_CONVERSATION': {
      const updatedContacts = state.pmContacts.map(c =>
        c.id === action.id ? { ...c, unread: 0 } : c
      )
      return { ...state, activePmId: action.id, pmContacts: updatedContacts }
    }

    default:
      return state
  }
}

// ── Context ─────────────────────────────────────────────────────────────────
export const ChatContext = createContext<ChatContextValue | null>(null)

// Retour explicite tsx.Element pour que TS accepte <ChatProvider> dans main.tsx
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatStore(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatStore doit être utilisé dans <ChatProvider>')
  return ctx
}
