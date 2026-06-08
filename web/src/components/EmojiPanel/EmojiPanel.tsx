import styles from './EmojiPanel.module.scss'

// ── Types ──────────────────────────────────────────────────────────────────
export interface EmojiEntry {
  e: string   // emoji character
  a: string   // action texte pour /me
}

interface Props {
  open:        boolean
  onEmoji:     (em: EmojiEntry) => void
  /** true dans les MP : insère l'emoji dans l'input au lieu d'envoyer un /me */
  insertOnly?: boolean
}

// ── Data ───────────────────────────────────────────────────────────────────
export const EMOJIS: EmojiEntry[] = [
  { e: '🔫', a: 'sort son arme et vise la cible'           },
  { e: '🚔', a: 'entend les sirènes approcher'             },
  { e: '🚗', a: 'monte dans sa voiture et démarre'         },
  { e: '💰', a: 'compte ses billets avec un sourire'        },
  { e: '🚁', a: "lève les yeux vers l'hélico qui survole"  },
  { e: '👮', a: 'remarque un policier dans son dos'        },
  { e: '💣', a: 'pose discrètement un explosif'            },
  { e: '🏃', a: 'prend ses jambes à son cou et fuit'       },
  { e: '🤝', a: 'tend la main pour sceller le deal'        },
  { e: '😤', a: "croise les bras et souffle d'agacement"   },
  { e: '📞', a: 'décroche son téléphone et appelle'        },
  { e: '🔒', a: 'vérifie que la porte est bien fermée'     },
  { e: '🗺️', a: "déplie une carte et l'étudie"            },
  { e: '🚨', a: 'active les gyrophares et part en urgence' },
  { e: '👀', a: 'jette un regard suspicieux autour de lui' },
  { e: '🎯', a: 'prend sa cible en ligne de mire'          },
]

// ── Component ──────────────────────────────────────────────────────────────
export default function EmojiPanel({ open, onEmoji, insertOnly = false }: Props) {
  if (!open) return null

  return (
    <div className={styles.panel}>
      {!insertOnly && (
        <p className={styles.hint}>
          Clic → envoie <code>/me &lt;action&gt;</code>
        </p>
      )}
      <div className={styles.grid}>
        {EMOJIS.map(em => (
          <button
            key={em.e}
            className={styles.item}
            title={insertOnly ? em.e : `/me ${em.a} ${em.e}`}
            onClick={() => onEmoji(em)}
          >
            {em.e}
          </button>
        ))}
      </div>
    </div>
  )
}
