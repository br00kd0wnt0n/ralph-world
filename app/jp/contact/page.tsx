import type { Metadata } from 'next'
import JpContactClient from '@/components/jp/JpContactClient'

export const metadata: Metadata = {
  title: 'お気軽にご相談ください — Ralph Creative Tokyo',
  description:
    'Ralph Creative Tokyo へのお問い合わせフォーム。ブランディング・キャンペーン・コンテンツ制作などのご相談を承ります。',
  alternates: {
    languages: { 'ja-JP': '/jp/contact', en: '/' },
  },
}

export default function JpContactPage() {
  return (
    // lang="ja" on the wrapper handles screen-reader pronunciation and
    // browser hyphenation for the JA copy without overriding the root
    // <html lang>. Full <html lang> swap would need a route-group layout
    // intercept — overkill for one page.
    <div lang="ja">
      <JpContactClient />
    </div>
  )
}
