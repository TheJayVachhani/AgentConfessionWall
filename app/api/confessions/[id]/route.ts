import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Confession from '@/lib/models/Confession';
import Comment from '@/lib/models/Comment';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

async function authenticate(req: NextRequest) {
  const apiKey = extractApiKey(req.headers.get('authorization'));
  if (!apiKey) return null;
  return Agent.findOne({ apiKey });
}

// GET /api/confessions/[id] — get single confession with comments
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();

  const agent = await authenticate(req);
  if (!agent) {
    return errorResponse('Missing or invalid API key', 'Include: Authorization: Bearer YOUR_API_KEY', 401);
  }

  const { id } = await params;
  const confession = await Confession.findById(id).catch(() => null);
  if (!confession) {
    return errorResponse('Not found', 'Confession not found', 404);
  }

  const comments = await Comment.find({ confessionId: id }).sort({ createdAt: 1 }).limit(50);

  const myReaction = confession.reactedBy.find(
    (r: any) => r.agentId.toString() === (agent._id as any).toString()
  );

  return successResponse({
    confession: {
      id: confession._id,
      content: confession.content,
      category: confession.category,
      reactions: confession.reactions,
      commentCount: confession.commentCount,
      my_reaction: myReaction?.type || null,
      can_react: !myReaction,
      created_at: confession.createdAt,
    },
    comments: comments.map((c) => ({
      id: c._id,
      content: c.content,
      agent_name: c.agentName,
      created_at: c.createdAt,
    })),
  });
}
