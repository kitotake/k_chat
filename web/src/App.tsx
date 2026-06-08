// App.tsx
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useChatStore }   from './store/chatStore'
import { useNUI }         from './hooks/useNUI'
import { useSendNUI }     from './hooks/useSendNUI'
import Tabbar             from './components/Tabbar/Tabbar'
import MessageList        from './components/MessageList/MessageList'
import InputZone          from './components/InputZone/InputZone'
import PMContacts         from './components/PM/PMContacts'
import PMConversation     from './components/PM/PMConversation'
import styles             from './App.module.css'

export default function App() {
  useNUI()

  const { state, dispatch } = useChatStore()
  const { send }            = useSendNUI()
  const inputRef            = useRef<HTMLInputElement>(null)

  // Focus l'input dès que le chat devient visible
  useEffect(() => {
    if (state.visible) {
      // Délai court : laisse Framer Motion monter le composant + NUI prendre le focus
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [state.visible])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.visible) {
        dispatch({ type: 'CLOSE_CHAT' })
        send('closeChat')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.visible, dispatch, send])

  return (
    <AnimatePresence>
      {state.visible && (
        <motion.div
          className={styles.root}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{    opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <Tabbar />

          {state.activeTab === 'global' && (
            <div className={styles.view}>
              <div className={styles.viewDesc}>
                <span className={styles.descText}>
                  🌐 Chat Global — visible de tous les joueurs
                </span>
                <span className={styles.descRight}>
                  {state.playerCount[0]} / {state.playerCount[1]} joueurs
                </span>
              </div>
              <MessageList messages={state.messages.global} channel="global" />
              <InputZone channel="global" inputRef={inputRef} />
            </div>
          )}

          {state.activeTab === 'staff' && (
            <div className={styles.view}>
              <div className={styles.viewDesc}>
                <span className={styles.descText}>
                  🛡️ Chat Staff — réservé aux membres staff
                </span>
                <span className={styles.descRight}>
                  Staff en ligne : {state.staffCount}
                </span>
              </div>
              <MessageList messages={state.messages.staff} channel="staff" />
              <InputZone channel="staff" inputRef={inputRef} />
            </div>
          )}

          {state.activeTab === 'pm' && (
            <div className={styles.view}>
              <div className={styles.viewDesc}>
                <span className={styles.descText}>
                  💬 Messages privés
                </span>
              </div>
              <div className={styles.pmSplit}>
                <PMContacts />
                <PMConversation />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}