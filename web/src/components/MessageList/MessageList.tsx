import { useEffect, useRef }       from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessage, colorFor }   from '../../store/chatStore'
import styles                      from './MessageList.module.scss'

// ── Types ──────────────────────────────────────────────────────────────────
interface Props {
  messages: ChatMessage[]
  channel:  'global' | 'staff'    // corrige "Binding element 'channel' implicitly has an 'any' type"
}

// Clés explicites — corrige "expression of type 'any' can't be used to index"
type RoleBadgeKey = 'Fondateur' | 'Admin' | 'Moderator' | 'Staff' | 'VIP'

const ROLE_BADGES: Record<RoleBadgeKey, string> = {
  Fondateur: 'founder',
  Admin:     'admin',
  Moderator: 'mod',
  Staff:     'staff',
  VIP:       'vip',
}

function isRoleBadgeKey(key: string | undefined): key is RoleBadgeKey {
  return key !== undefined && key in ROLE_BADGES
}

// ── Component ──────────────────────────────────────────────────────────────
export default function MessageList({ messages, channel }: Props) {
  // useRef<HTMLDivElement> — corrige "Property 'scrollIntoView' does not exist on type 'never'"
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className={styles.wrap}>
      {messages.length === 0 && (
        <p className={styles.empty}>Aucun message pour le moment…</p>
      )}

      <AnimatePresence initial={false}>
        {messages.map((msg: ChatMessage) => {
          const isMeAction = msg.text.startsWith('* ')
          const badgeKey   = isRoleBadgeKey((msg as any).role)
            ? (msg as any).role as RoleBadgeKey
            : null

          return (
            <motion.div
              key={msg.id}
              className={[
                styles.msg,
                isMeAction             ? styles.meAction  : '',
                channel === 'staff'    ? styles.staffMsg  : '',
              ].join(' ')}
              // CSS custom property : cast en React.CSSProperties via type assertion
              // corrige "'--author-color' does not exist in type 'Properties'"
              style={{ '--author-color': colorFor(msg.author) } as React.CSSProperties}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <span className={styles.time}>{msg.time}</span>
              <span className={styles.author} style={{ color: colorFor(msg.author) }}>
                {badgeKey && (
                  <span className={`badge badge--${ROLE_BADGES[badgeKey]}`}>
                    {badgeKey}
                  </span>
                )}
                {msg.author}
              </span>
              <span className={styles.text}>{msg.text}</span>
            </motion.div>
          )
        })}
      </AnimatePresence>

      <div ref={bottomRef} />
    </div>
  )
}
