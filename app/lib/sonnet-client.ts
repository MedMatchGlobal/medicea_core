import {claudePreviewEnabled,claudeCompletion} from './claude-preview';
// Use the previous Sonnet transport, research additions and response handling.
export const sonnetPreviewEnabled=claudePreviewEnabled;
export async function sonnetCompletion(init:RequestInit):Promise<Response>{
  return claudeCompletion('https://api.openai.com/v1/chat/completions',init);
}