import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { withAuth } from '@/server/lib/withAuth'
import { runChat } from '@/server/services/AIChatService'
import { chatRequestSchema } from '@/server/validators/aiChat'

export const POST = withAuth(async (request) => {
  try {
    const body = await request.json()
    const { message, conversationHistory } = chatRequestSchema.parse(body)
    const result = await runChat(message, conversationHistory)
    return NextResponse.json(result)
  } catch (err) {
    return toErrorResponse(err)
  }
})
