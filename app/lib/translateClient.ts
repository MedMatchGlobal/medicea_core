// app/lib/translateClient.ts
export async function translateClient(text: string, lang: string): Promise<string> {
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang: lang }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    return (data?.text || data?.translatedText || text) as string;
  } catch {
    return text; // fail open: show original if translation API fails
  }
}
