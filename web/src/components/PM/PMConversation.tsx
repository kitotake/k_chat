import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore }  from '../../store/chatStore'
import { useSendNUI }    from '../../hooks/useSendNUI'
import EmojiPanel, { EmojiEntry } from '../EmojiPanel/EmojiPanel'
import styles from './PM.module.scss'

export default function PMConversation() {
  const { state, dispatch } = useChatStore()
  const { send }            = useSendNUI()

  const { activePmId, pmContacts } = state
  const contact = pmContacts.find(c => c.id === activePmId)

  const [value,     setValue]     = useState<string>('')
  const [emojiOpen, setEmojiOpen] = useState<boolean>(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Auto-scroll à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [contact?.msgs.length])

  // Reset + focus quand on change de conv
  useEffect(() => {
    setValue('')
    setEmojiOpen(false)
    inputRef.current?.focus()
  }, [activePmId])

  const handleSend = useCallback(() => {
    const v = value.trim()
    if (!v || !activePmId) return

    dispatch({ type: 'SEND_PM', text: v })
    send('sendPm', { targetId: activePmId, message: v })

    setValue('')
    setEmojiOpen(false)
  }, [value, activePmId, dispatch, send])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') setEmojiOpen(false)
  }

  // Emoji en MP = insertion dans l'input (pas de /me)
  const handleEmoji = useCallback((em: EmojiEntry) => {
    setValue(v => v + em.e)
    setEmojiOpen(false)
    inputRef.current?.focus()
  }, [])

  if (!contact) {
    return (
      <div className={styles.convEmpty}>
        <span>Sélectionne un joueur pour lui écrire</span>
      </div>
    )
  }

  return (
    <div className={styles.conv}>
      {/* Header */}
      <div className={styles.convHeader}>
        <div
          className={styles.avatar}
          style={{ background: contact.color + '22', color: contact.color }}
        >
          {contact.initials}
        </div>
        <span className={styles.convName} style={{ color: contact.color }}>
          {contact.name}
        </span>
        <span className={styles.convSub}>Message privé</span>
      </div>

      {/* Messages */}
      <div className={styles.convMsgs}>
        {contact.msgs.length === 0 && (
          <p className={styles.empty}>Début de la conversation…</p>
        )}

        <AnimatePresence initial={false}>
          {contact.msgs.map(msg => (
            <motion.div
              key={msg.id}
              className={`${styles.bubble} ${msg.mine ? styles.bubbleOut : styles.bubbleIn}`}
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1    }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {msg.text}
              <div className={styles.bubbleTime}>{msg.time}</div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Zone saisie */}
      <div className={styles.convInput}>
        <EmojiPanel open={emojiOpen} onEmoji={handleEmoji} insertOnly />

        <div className={styles.row}>
          <div className={styles.inputBox}>
            <span className={styles.pmPrefix}>💬</span>
            <input
              ref={inputRef}
              className={styles.input}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message privé…"
              maxLength={150}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <button
            className={`${styles.iconBtn} ${emojiOpen ? styles.iconBtnActive : ''}`}
            onClick={() => setEmojiOpen(o => !o)}
            title="Emojis"
          >
            {emojiOpen ? '✕' : '😶'}
          </button>

          <button className={styles.sendBtnPm} onClick={handleSend}>
            <SendIcon />
            Envoyer
          </button>
        </div>
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
