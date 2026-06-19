import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const NAMECARD_ID = import.meta.env.VITE_NAMECARD_ID || 'bach-nguyen'
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '19871988'
export const STORAGE_BUCKET = 'namecard-photos'

export interface NamecardData {
  id: string
  name: string
  title_vi: string
  title_en: string
  phone: string
  email: string
  photo_url: string
  zalo: string
  updated_at: string
}

export const DEFAULT_DATA: NamecardData = {
  id: NAMECARD_ID,
  name: 'NGUYỄN TIẾN BÁCH',
  title_vi: 'Giám Đốc Điều Hành',
  title_en: 'Executive Director',
  phone: '0908583999',
  email: 'ceo@thucphamsomot.vn',
  photo_url: '',
  zalo: '0908583999',
  updated_at: new Date().toISOString(),
}

export async function fetchNamecard(id: string): Promise<NamecardData | null> {
  const { data, error } = await supabase
    .from('namecards')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    if (id === 'bach-nguyen') return DEFAULT_DATA
    return null
  }
  return data as NamecardData
}

export async function fetchAllNamecards(): Promise<NamecardData[]> {
  const { data, error } = await supabase
    .from('namecards')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error || !data) return []
  return data as NamecardData[]
}

export async function saveNamecard(id: string, updates: Partial<NamecardData>): Promise<boolean> {
  const { error } = await supabase
    .from('namecards')
    .upsert({ ...updates, id, updated_at: new Date().toISOString() })

  return !error
}

export async function deleteNamecard(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('namecards')
    .delete()
    .eq('id', id)

  return !error
}

export async function checkIdUnique(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('namecards')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (error) return false
  return !data
}

export async function uploadPhoto(id: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const fileName = `${id}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, { upsert: true })

  if (error) return null

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(fileName)

  return data.publicUrl
}

