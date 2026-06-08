import { useChatStore } from '../../store/chatStore'
import styles from './PM.module.scss'

export default function PMContacts() {
  const { state, dispatch } = useChatStore()
  const { pmContacts, activePmId } = state

  const openConv = (id: string) => {
    dispatch({ type: 'SWITCH_TAB',        tab: 'pm' })
    dispatch({ type: 'OPEN_CONVERSATION', id })
  }

  return (
    <div className={styles.contacts}>
      {pmContacts.length === 0 && (
        <p className={styles.empty}>Aucun joueur connecté</p>
      )}

      {pmContacts.map(contact => (
        <div
          key={contact.id}
          className={`${styles.contact} ${contact.id === activePmId ? styles.contactActive : ''}`}
          onClick={() => openConv(contact.id)}
        >
          <div
            className={styles.avatar}
            style={{
              background:  contact.color + '22',
              color:       contact.color,
              borderColor: contact.id === activePmId ? contact.color : 'transparent',
            }}
          >
            {contact.initials}
          </div>

          <div className={styles.contactInfo}>
            <span className={styles.contactName}>{contact.name}</span>
            {contact.lastPreview && (
              <span className={styles.contactPreview}>{contact.lastPreview}</span>
            )}
          </div>

          {contact.unread > 0 && (
            <span className={styles.unread}>
              {contact.unread > 99 ? '99+' : contact.unread}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
