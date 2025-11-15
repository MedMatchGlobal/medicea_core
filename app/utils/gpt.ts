export async function askGPT(initialSymptom: string, history: string[]): Promise<string> {
  const messages = [
    {
      role: 'system',
      content: `You are a helpful and professional physical symptom triage assistant. You do not provide psychological advice even if explicitly asked, in which case, refer to a professional. Your goal is to gather more detail from the user to help them understand the possible physical causes of their symptoms, and guide them to seek appropriate medical attention if needed`,
    },
    ...history.map((entry) => {
      const isUser = entry.startsWith('User: ');
      return {
        role: isUser ? 'user' : 'assistant',
        content: entry.replace(/^User: |^AI: /, ''),
      };
    }),
  ];

  const response = await fetch('/api/triage', {
    method: 'POST',
    body: JSON.stringify({ messages }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('OpenAI API failed:', await response.text());
    throw new Error('Failed to get response from GPT.');
  }

  const reader = response.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  return result;
}
