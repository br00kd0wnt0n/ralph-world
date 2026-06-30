import { Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './EmailLayout'

interface Props {
  /** Submitter's name (used in greeting). */
  name: string
  /** Already-expanded JA labels for Q1 selections (echo back for their record). */
  needsLabels: string[]
  /** Already-expanded JA labels for Q2 selections. */
  projectSizeLabels: string[]
}

/**
 * Confirmation email sent to the person who submitted the /jp/contact
 * form. Light acknowledgement + restates the 2-business-day promise the
 * form makes on screen. Echoes their selections so they have a record.
 */
export function ContactJpConfirmation({
  name,
  needsLabels,
  projectSizeLabels,
}: Props) {
  return (
    <EmailLayout
      preview={`${name}様、ご相談ありがとうございます。`}
      locale="ja"
    >
      <Text style={eyebrow}>ご相談ありがとうございます</Text>
      <Text style={styles.h1}>{name}様、ご連絡ありがとうございます</Text>

      <hr style={styles.divider} />

      <Text style={styles.paragraph}>
        Ralph Creative Tokyo にお問い合わせいただきありがとうございます。
        内容を確認のうえ、通常2営業日以内に担当よりご連絡いたします。
      </Text>
      <Text style={styles.paragraph}>
        まずはカジュアルに、気軽な気持ちでお話しできれば嬉しいです。
      </Text>

      <Section style={summaryCard}>
        <Text style={summaryLabel}>ご相談内容</Text>
        <Text style={summaryValue}>
          {needsLabels.length > 0 ? needsLabels.join('、') : '（未選択）'}
        </Text>
        <Text style={summaryLabel}>プロジェクトの規模感</Text>
        <Text style={summaryValue}>
          {projectSizeLabels.length > 0
            ? projectSizeLabels.join('、')
            : '（未選択）'}
        </Text>
      </Section>

      <Text style={styles.detail}>
        このメールは送信専用アドレスからお送りしています。返信は
        tokyo@ralphandco.com までお願いいたします。
      </Text>
    </EmailLayout>
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

const summaryCard = {
  backgroundColor: '#F5F2EC',
  border: '1px solid #E4DED1',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '8px 0 18px',
}

const summaryLabel = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: '#6B5B8A',
  margin: '6px 0 4px',
}

const summaryValue = {
  fontSize: '15px',
  lineHeight: 1.5,
  color: '#0B0B0B',
  margin: '0 0 6px',
}
