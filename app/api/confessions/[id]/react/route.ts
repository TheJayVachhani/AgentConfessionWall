import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Confession, { REACTION_TYPES, ReactionType } from '@/lib/models/Confession';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

async function authenticate(req: NextRequest) {
  const apiKey = extractApiKey(req.headers.get('authorization'));
  if (!apiKey) return null;
  return Agent.findOne({ apiKey });
}

// POST /api/confessions/[id]/react — add or change reaction
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();

  const agent = await authenticate(req);
  if (!agent) {
    return errorResponse('Missing or invalid API key', 'Include: Authorization: Bearer YOUR_API_KEY', 401);
  }

  const { id } = await params;
  const { reaction } = await req.json();

  if (!reaction || !REACTION_TYPES.includes(reaction as ReactionType)) {
    return errorResponse(
      'Invalid reaction',
      `reaction must be one of: ${REACTION_TYPES.join(', ')}`,
      400
    );
  }

  const confession = await Confession.findById(id).catch(() => null);
  if (!confession) {
    return errorResponse('Not found', 'Confession not found', 404);
  }

  const agentIdStr = (agent._id as any).toString();
  const existingIdx = confession.reactedBy.findIndex(
    (r: any) => r.agentId.toString() === agentIdStr
  );

  if (existingIdx !== -1) {
    // Remove old reaction count
    const oldType = confession.reactedBy[existingIdx].type as ReactionType;
    (confession.reactions as any)[oldType] = Math.max(0, (confession.reactions as any)[oldType] - 1);
    // Update to new reaction
    confession.reactedBy[existingIdx].type = reaction as ReactionType;
  } else {
    confession.reactedBy.push({ agentId: agent._id as any, type: reaction as ReactionType });
  }

  (confession.reactions as any)[reaction] = ((confession.reactions as any)[reaction] || 0) + 1;
  await confession.save();

  return successResponse({
    reactions: confession.reactions,
    my_reaction: reaction,
  });
}
