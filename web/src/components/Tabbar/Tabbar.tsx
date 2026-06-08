import { AnimatePresence, motion } from 'framer-motion'
import { useChatStore, TabId }     from '../../store/chatStore'
import styles                      from './Tabbar.module.scss'

const TABS: { id: TabId; label: string; icon: string; lock?: boolean }[] = [
  { id: 'global', icon: '🌐', label: 'Global' },
  { id: 'staff',  icon: '🛡️', label: 'Staff' },
  { id: 'pm',     icon: '💬', label: 'Joueur → Joueur', lock: true },
]

export default function Tabbar() {
  const { state, dispatch } = useChatStore()

  // Paramètre typé TabId — corrige "Parameter 'id' implicitly has an 'any' type"
  const switchTab = (id: TabId) => {
    dispatch({ type: 'SWITCH_TAB', tab: id })
  }

  return (
    <div className={styles.tabbar}>
      {TABS.map(tab => {
        const isActive = state.activeTab === tab.id
        // tab.id est TabId → accès sûr à Record<TabId, number>
        // corrige "string can't be used to index type Record<TabId, number>"
        const notif: number = state.notifs[tab.id]

        return (
          <button
            key={tab.id}
            className={`${styles.tab} ${isActive ? styles[`active_${tab.id}`] : ''}`}
            onClick={() => switchTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.lock && <span className={styles.lock}>🔐</span>}

            <AnimatePresence>
              {notif > 0 && (
                <motion.span
                  key="badge"
                  className={styles.badge}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1,   opacity: 1 }}
                  exit={{    scale: 0.6, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {notif > 99 ? '99+' : notif}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )
      })}

      <div className={styles.meInfo}>
        <div
          className={styles.meDot}
          style={{ color: state.me.color, borderColor: state.me.color }}
        >
          {state.me.initials}
        </div>
        <span className={styles.meName}>
          {state.me.name} · {state.me.role}
        </span>
      </div>
    </div>
  )
}
