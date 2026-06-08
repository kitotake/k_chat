import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore }  from '../../store/chatStore'
import { useSendNUI }    from '../../hooks/useSendNUI'
import EmojiPanel, { EmojiEntry } from '../EmojiPanel/EmojiPanel'
import styles from './InputZone.module.scss'

// ── Types ──────────────────────────────────────────────────────────────────
interface Props {
  channel: 'global' | 'staff'
}

interface CmdEntry {
  cmd:  string
  desc: string
}

// ── Données ────────────────────────────────────────────────────────────────
const COMMANDS: CmdEntry[] = [
  { cmd: '/me',        desc: 'Action RP visible de tous'   },
  { cmd: '/tp',        desc: 'Téléporter vers un joueur'   },
  { cmd: '/tpm',       desc: 'Téléporter à des coords'     },
  { cmd: '/time',      desc: "Changer l'heure du serveur"  },
  { cmd: '/kill',      desc: 'Se tuer / tuer un joueur'    },
  { cmd: '/kick',      desc: 'Expulser un joueur'          },
  { cmd: '/ban',       desc: 'Bannir un joueur'            },
  { cmd: '/respawn',   desc: 'Réapparaître'                },
  { cmd: '/givemoney', desc: "Donner de l'argent"          },
  { cmd: '/noclip',    desc: 'Activer le noclip'           },
  { cmd: '/coords',    desc: 'Afficher mes coordonnées'    },
  { cmd: '/clear',     desc: 'Vider le chat'               },
  { cmd: '/pm',        desc: 'Message privé'               },
  { cmd: '/setjob',    desc: 'Changer de job'              },
  { cmd: '/heal',      desc: 'Se soigner'                  },
]

// ── Component ──────────────────────────────────────────────────────────────
export default function InputZone({ channel }: Props) {
  const { dispatch } = useChatStore()
  const { send }     = useSendNUI()

  const [value,     setValue]     = useState<string>('')
  const [emojiOpen, setEmojiOpen] = useState<boolean>(false)
  const [tabList,   setTabList]   = useState<CmdEntry[]>([])
  const [tabIdx,    setTabIdx]    = useState<number>(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filterCmds = useCallback((v: string): CmdEntry[] => {
    if (!v.startsWith('/')) return []
    return COMMANDS.filter(c => c.cmd.startsWith(v)).slice(0, 6)
  }, [])

  // ── Envoi ──────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const v = value.trim()
    if (!v) return

    const text = v.startsWith('/me ') ? '* ' + v.slice(4) : v
    dispatch({ type: 'SEND_MESSAGE', channel, text })
    send('sendMessage', { channel, message: v })

    setValue('')
    setTabList([])
    setEmojiOpen(false)
  }, [value, channel, dispatch, send])

  // ── Clavier ────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {

    if (e.key === 'Enter') {
      e.preventDefault()
      // Si une suggestion est visible, valider sans envoyer
      if (tabList.length > 0) {
        setValue(tabList[tabIdx].cmd + ' ')
        setTabList([])
        return
      }
      handleSend()
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      if (tabList.length === 0) {
        const list = value.startsWith('/') ? filterCmds(value) : COMMANDS.slice(0, 6)
        if (list.length === 0) return
        if (!value.startsWith('/')) setValue('/')
        setTabList(list)
        setTabIdx(0)
        return
      }
      // Cycle TAB
      const next = (tabIdx + 1) % tabList.length
      setTabIdx(next)
      setValue(tabList[next].cmd + ' ')
      return
    }

    if (e.key === 'ArrowDown' && tabList.length > 0) {
      e.preventDefault()
      const next = (tabIdx + 1) % tabList.length
      setTabIdx(next)
      setValue(tabList[next].cmd + ' ')
      return
    }

    if (e.key === 'ArrowUp' && tabList.length > 0) {
      e.preventDefault()
      const prev = (tabIdx - 1 + tabList.length) % tabList.length
      setTabIdx(prev)
      setValue(tabList[prev].cmd + ' ')
      return
    }

    if (e.key === 'Escape') {
      setTabList([])
      setEmojiOpen(false)
    }
  }, [tabList, tabIdx, value, filterCmds, handleSend])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setValue(v)
    setTabList(filterCmds(v))
    setTabIdx(0)
  }

  // ── Emoji RP ──────────────────────────────────────────────────────────
  const handleEmoji = useCallback((em: EmojiEntry) => {
    const text = `* ${em.a} ${em.e}`
    dispatch({ type: 'SEND_MESSAGE', channel, text })
    send('sendMessage', { channel, message: `/me ${em.a} ${em.e}` })
    setEmojiOpen(false)
    inputRef.current?.focus()
  }, [channel, dispatch, send])

  const isCmd    = value.startsWith('/')
  const charLeft = 150 - value.length
  const warnChar = charLeft < 30

  return (
    <div className={styles.zone}>
      {/* Suggestions TAB */}
      <AnimatePresence>
        {tabList.length > 0 && (
          <motion.div
            className={styles.suggestions}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
          >
            {tabList.map((c, i) => (
              <div
                key={c.cmd}
                className={`${styles.suggestion} ${i === tabIdx ? styles.selected : ''}`}
                onClick={() => {
                  setValue(c.cmd + ' ')
                  setTabList([])
                  inputRef.current?.focus()
                }}
              >
                <span className={styles.sugCmd}>{c.cmd}</span>
                <span className={styles.sugDesc}>{c.desc}</span>
                <span className={styles.sugKey}>TAB</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panneau emoji */}
      <EmojiPanel open={emojiOpen} onEmoji={handleEmoji} />

      {/* Ligne input */}
      <div className={styles.row}>
        <div className={`${styles.inputBox} ${isCmd ? styles.cmdMode : ''}`}>
          <span className={styles.prefix}>{isCmd ? '/' : '›'}</span>
          <input
            ref={inputRef}
            className={styles.input}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={channel === 'staff' ? 'Message staff…' : 'Message global…'}
            maxLength={150}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <button
          className={`${styles.iconBtn} ${emojiOpen ? styles.iconBtnActive : ''}`}
          onClick={() => setEmojiOpen(o => !o)}
          title="Emojis RP"
        >
          {emojiOpen ? '✕' : '😶'}
        </button>

        <button className={styles.sendBtn} onClick={handleSend}>
          <SendIcon />
          Envoyer
        </button>
      </div>

      {/* Hints + compteur */}
      <div className={styles.hints}>
        <span className={styles.hint}><kbd>TAB</kbd> Commandes</span>
        <span className={styles.hint}><kbd>↑↓</kbd> Naviguer</span>
        <span className={styles.hint}><kbd>↵</kbd> Envoyer</span>
        <span className={styles.hint}><kbd>ESC</kbd> Fermer</span>
        <span className={`${styles.charCount} ${warnChar ? styles.warn : ''}`}>
          {value.length}/150
        </span>
      </div>
    </div>
  )
}

function SendIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}
