const KEY   = import.meta.env.VITE_OPENROUTER_KEY as string
const MODEL = 'openai/gpt-4o-mini'
const BASE  = 'https://openrouter.ai/api/v1'

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  name?: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

export interface ToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, { type: string; description?: string; enum?: string[] }>
      required?: string[]
    }
  }
}

export async function llmChat(messages: LLMMessage[], tools?: ToolDef[]): Promise<LLMMessage> {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 512,
  }
  if (tools?.length) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Podium Olympics',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 120)}`)
  }

  const data = await res.json()
  return data.choices[0].message as LLMMessage
}
