"use server";

import { createClient } from "@supabase/supabase-js";

export interface NamecardData {
  id: string;
  name: string;
  title_vi: string;
  title_en: string;
  phone: string;
  email: string;
  photo_url: string;
  zalo: string;
  updated_at: string;
}

const supabase = createClient(
  process.env.NAMECARD_SUPABASE_URL!,
  process.env.NAMECARD_SUPABASE_ANON_KEY!
);

const STORAGE_BUCKET = "namecard-photos";

export async function verifyAdminPassword(password: string): Promise<boolean> {
  return password === process.env.NAMECARD_ADMIN_PASSWORD;
}

export async function fetchAllNamecards(): Promise<NamecardData[]> {
  const { data, error } = await supabase
    .from("namecards")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data as NamecardData[];
}

export async function saveNamecard(
  id: string,
  updates: Partial<NamecardData>
): Promise<boolean> {
  const { error } = await supabase
    .from("namecards")
    .upsert({ ...updates, id, updated_at: new Date().toISOString() });

  return !error;
}

export async function deleteNamecard(id: string): Promise<boolean> {
  const { error } = await supabase.from("namecards").delete().eq("id", id);
  return !error;
}

export async function checkIdUnique(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("namecards")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) return false;
  return !data;
}

export async function uploadPhoto(
  id: string,
  formData: FormData
): Promise<string | null> {
  const file = formData.get("file") as File;
  if (!file) return null;

  const ext = file.name.split(".").pop();
  const fileName = `${id}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, { upsert: true });

  if (error) return null;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

  return data.publicUrl;
}
