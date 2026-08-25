import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { idParamSchema } from '@/server/validators/common'
import { updatePrintRunItemSchema } from '@/server/validators/printRun'

type Context = { params: Promise<{ id: string }> }

// Marks a single design line within a run as done/undone. This tracks
// production progress independently of the run's own status — it's not
// gated on the run being PLANNED or FINISHED, and never touches inventory.
export const PATCH = withAuth<Context>(async (request, context) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const body = await request.json()
    const { done } = updatePrintRunItemSchema.parse(body)
    const item = await prisma.printRunItem.update({
      where: { id },
      data: { done },
      include: { design: true, colorway: true, sizes: true },
    })
    return NextResponse.json(item)
  } catch (err) {
    return toErrorResponse(err)
  }
})
