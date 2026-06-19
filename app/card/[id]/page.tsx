import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import NamecardClient from './namecard-client'

const SUPABASE_URL = process.env.NAMECARD_SUPABASE_URL!
const SUPABASE_KEY = process.env.NAMECARD_SUPABASE_ANON_KEY!

export interface NamecardData {
  id: string
  name: string
  title_vi: string
  title_en: string
  phone: string
  email: string
  photo_url: string
  zalo: string
  updated_at?: string
}

const DEFAULT_DATA: NamecardData = {
  id: 'bach-nguyen',
  name: 'NGUYỄN TIẾN BÁCH',
  title_vi: 'Giám Đốc Điều Hành',
  title_en: 'Executive Director',
  phone: '0908583999',
  email: 'ceo@thucphamsomot.vn',
  photo_url: '',
  zalo: '0908583999',
}

async function fetchNamecard(id: string): Promise<NamecardData | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/namecards?id=eq.${id}&select=*`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        next: { revalidate: 60 }, // ISR: refresh every 60 seconds
      }
    )
    if (!res.ok) throw new Error('fetch failed')
    const rows: NamecardData[] = await res.json()
    if (rows?.length) return rows[0]
    // Fallback to default for known ID
    if (id === 'bach-nguyen') return DEFAULT_DATA
    return null
  } catch {
    if (id === 'bach-nguyen') return DEFAULT_DATA
    return null
  }
}

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const data = await fetchNamecard(id)
  if (!data) return { title: 'E-Namecard | Thực Phẩm Số Một' }
  return {
    title: `${data.name} | ${data.title_vi} | E-Namecard | Thực Phẩm Số Một`,
    description: `E-Namecard của ${data.name} – ${data.title_vi}, ${data.title_en}. Công Ty TNHH Thực Phẩm Số Một Đồng Nai. Liên hệ: ${data.phone}`,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${data.name} | Thực Phẩm Số Một`,
      description: `${data.title_vi} – Giải pháp thực phẩm toàn diện cho mọi bếp ăn`,
      type: 'profile',
    },
  }
}

export default async function CardPage({ params }: Props) {
  const { id } = await params
  const data = await fetchNamecard(id)
  if (!data) notFound()

  const currentUrl = `https://thucphamsomot.vn/card/${id}`
  return <NamecardClient data={data} currentUrl={currentUrl} />
}
