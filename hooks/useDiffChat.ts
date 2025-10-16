import { useState, useCallback } from 'react';

interface DocumentContext {
  documentTitle?: string;
  version1?: string;
  version2?: string;
  agency?: string;
  versionText?: string;
  summaryText?: string;
  [key: string]: any;
}

interface DiffChatResponse {
  type: 'ping' | 'metadata' | 'start' | 'delta' | 'end' | 'error';
  data: any;
}

const DIFF_CHAT_API_URL = 'https://2mdw5avyrj6woktn3d5d4z4vz40pbsjs.lambda-url.ap-southeast-2.on.aws/';

export function useDiffChat() {
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    message: string,
    documentContext?: DocumentContext,
    sessionId?: string,
    onComplete?: (fullResponse: string) => void
  ) => {
    setIsLoading(true);
    setError(null);
    setResponse('');

    try {
      const res = await fetch(DIFF_CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          document_context: documentContext,
          session_id: sessionId || `diff-session-${Date.now()}`,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let streamingResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim();
            continue;
          }

          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            // Handle different event types
            if (data.text) {
              // Delta event - append text
              streamingResponse += data.text;
              setResponse(streamingResponse);
            } else if (data.done) {
              // End event
              console.log('Response complete:', data);
              if (onComplete) {
                onComplete(streamingResponse);
              }
            } else if (data.message && data.message !== 'Streaming started' && !data.done && !data.timestamp) {
              // Error event (but ignore start messages and metadata)
              setError(data.message);
            }
            // Ignore ping, metadata, and start events
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendMessage, response, isLoading, error };
}
