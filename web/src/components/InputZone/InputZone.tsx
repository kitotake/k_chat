import { useState, useCallback, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSendNUI }    from '../../hooks/useSendNUI'
import EmojiPanel, { EmojiEntry } from '../EmojiPanel/EmojiPanel'
import styles from './InputZone.module.scss'

// ── Types ──────────────────────────────────────────────────────────────────
interface Props {
  channel:  'global' | 'staff'
  inputRef: React.RefObject<HTMLInputElement>   // ← ajout
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
export default function InputZone({ channel, inputRef }: Props) {
  const { send } = useSendNUI()

  const [value,     setValue]     = useState<string>('')
  const [emojiOpen, setEmojiOpen] = useState<boolean>(false)
  const [tabList,   setTabList]   = useState<CmdEntry[]>([])
  const [tabIdx,    setTabIdx]    = useState<number>(0)
  

  const filterCmds = useCallback((v: string): CmdEntry[] => {
    if (!v.startsWith('/')) return []
    return COMMANDS.filter(c => c.cmd.startsWith(v)).slice(0, 6)
  }, [])

  // ── Reset helpers ──────────────────────────────────────────────────────
  const resetInput = useCallback(() => {
    setValue('')
    setTabList([])
    setEmojiOpen(false)
  }, [])

  // ── Envoi ──────────────────────────────────────────────────────────────
  // Pas de dispatch local : le serveur broadcast en retour via receiveGlobal/receiveStaff,
  // ce qui alimente le store. Évite le double affichage.
const handleSend = useCallback(() => {
  const v = value.trim()
  if (!v) return

  resetInput()

  if (v.startsWith('/')) {
    send('executeCommand', { command: v })
    return
  }

  send('sendMessage', { channel, message: v })
}, [value, channel, send, resetInput])

  // ── Clavier ────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {

    if (e.key === 'Enter') {
      e.preventDefault()
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

  // ── Emoji RP ───────────────────────────────────────────────────────────
  // Pas de dispatch local non plus : le serveur broadcast le /me en retour
  const handleEmoji = useCallback((em: EmojiEntry) => {
    send('executeCommand', { command: `/me ${em.a} ${em.e}` })
    setEmojiOpen(false)
    inputRef.current?.focus()
  }, [send])

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