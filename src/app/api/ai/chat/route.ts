import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error('[API/AI/CHAT] Failed to parse request JSON:', parseErr);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload in request body' },
        { status: 400 }
      );
    }

    const { prompt, messages } = body;

    let chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    const systemMessage: OpenAI.Chat.ChatCompletionMessageParam = {
      role: 'system',
      content: `You are XENO Copilot, an advanced AI Marketing Assistant for XENO CRM.
You are a creative, strategic retail marketer and copywriter.
Help brands segment their customers, write campaigns (Email, SMS, WhatsApp), design workflows, and analyze campaigns.
Keep your output structured, using professional Markdown format.`,
    };

    if (messages && Array.isArray(messages)) {
      chatMessages = [
        systemMessage,
        ...messages.map((m: any) => ({
          role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.content,
        })),
      ];
    } else if (prompt && typeof prompt === 'string' && prompt.trim() !== '') {
      chatMessages = [
        systemMessage,
        { role: 'user' as const, content: prompt },
      ];
    } else {
      return NextResponse.json(
        { success: false, error: 'Either prompt or messages array is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[API/AI/CHAT] GROQ_API_KEY is not defined in environment variables.');
      return NextResponse.json(
        { success: false, error: 'GROQ_API_KEY is not configured on the server. Please check your .env configuration.' },
        { status: 500 }
      );
    }

    console.log('[API/AI/CHAT] Initializing Groq OpenAI client compatibility layer...');
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const modelName = 'llama-3.3-70b-versatile';
    console.log(`[API/AI/CHAT] Dispatching stream request to Groq using model: ${modelName}`);

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: chatMessages,
      temperature: 0.7,
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error: any) {
          console.error('[API/AI/CHAT] Stream generation error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('[API/AI/CHAT] Fatal handler error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error communicating with Groq API' },
      { status: 500 }
    );
  }
}
