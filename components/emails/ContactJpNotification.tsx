import { Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './EmailLayout'

interface Props {
  /** Submitter's name */
  name: string
  /** Submitter's company (optional). */
  company?: string | null
  /** Submitter's email address. */
  email: string
  /** Free-text message from the submitter (optional). */
  message?: string | null
  /** Already-expanded JA labels for Q1 selections. */
  needsLabels: string[]
  /** Already-expanded JA labels for Q2 selections. */
  projectSizeLabels: string[]
  /** Pre-formatted submission timestamp (JST, e.g. "2026年6月19日 14:32"). */
  submittedAt: string
}

/**
 * Notification email sent to the Tokyo team when a /jp/contact form is
 * submitted. JA copy throughout — the team is JA-speaking. Field labels
 * mirror the form so context is immediate.
 */
export function ContactJpNotification({
  name,
  company,
  email,
  message,
  needsLabels,
  projectSizeLabels,
  submittedAt,
}: Props) {
  return (
    <EmailLayout
      preview={`新しいご相談 — ${name}様`}
      locale="ja"
    >
      <Text style={eyebrow}>NEW CONTACT</Text>
      <Text style={styles.h1}>新しいご相談が届きました</Text>

      <hr style={styles.divider} />

      <Text style={styles.paragraph}>
        {name}様より、/jp/contact フォームから新しいご相談が届きました。
        通常2営業日以内にご返信をお願いします。
      </Text>

      <Section style={card}>
        <Field label="お名前" value={name} />
        {company ? <Field label="会社名・ブランド名" value={company} /> : null}
        <Field label="メールアドレス" value={email} />
        <Field
          label="ご相談内容"
          value={needsLabels.length > 0 ? needsLabels.join('、') : '（未選択）'}
        />
        <Field
          label="プロジェクトの規模感"
          value={projectSizeLabels.length > 0 ? projectSizeLabels.join('、') : '（未選択）'}
        />
        {message ? <Field label="メッセージ" value={message} multiline /> : null}
        <Field label="送信日時" value={submittedAt} />
      </Section>

      <Text style={styles.detail}>
        この通知は ralph-world から自動送信されています。
      </Text>
    </EmailLayout>
  )
}

function Field({
  label,
  value,
  multiline = false,
}: {
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div style={fieldRow}>
      <Text style={fieldLabel}>{label}</Text>
      <Text style={multiline ? fieldValueMultiline : fieldValue}>{value}</Text>
    </div>
  )
}

const eyebrow = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase' as const,
  color: '#EA128B',
  margin: '0 0 12px',
}

const card = {
  backgroundColor: '#F5F2EC',
  border: '1px solid #E4DED1',
  borderRadius: '8px',
  padding: '4px 18px',
  margin: '12px 0 18px',
}

const fieldRow = {
  padding: '10px 0',
  borderBottom: '1px solid #E4DED1',
}

const fieldLabel = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: '#6B5B8A',
  margin: '0 0 4px',
}

const fieldValue = {
  fontSize: '15px',
  lineHeight: 1.5,
  color: '#0B0B0B',
  margin: 0,
}

const fieldValueMultiline = {
  ...fieldValue,
  whiteSpace: 'pre-line' as const,
}
