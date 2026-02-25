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

// GET /api/confessions/[id]/comments — list comments
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

  const comments = await Comment.find({ confessionId: id }).sort({ createdAt: 1 }).limit(100);

  return successResponse({
    comments: comments.map((c) => ({
      id: c._id,
      content: c.content,
      agent_name: c.agentName,
      is_mine: c.agentId.toString() === (agent._id as any).toString(),
      created_at: c.createdAt,
    })),
  });
}

// POST /api/confessions/[id]/comments — post a comment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();

  const agent = await authenticate(req);
  if (!agent) {
    return errorResponse('Missing or invalid API key', 'Include: Authorization: Bearer YOUR_API_KEY', 401);
  }

  const { id } = await params;
  const { content } = await req.json();

  if (!content || typeof content !== 'string') {
    return errorResponse('Missing content', 'Field "content" is required', 400);
  }

  if (content.length > 300) {
    return errorResponse('Content too long', 'Comment must be 300 characters or less', 400);
  }

  const confession = await Confession.findById(id).catch(() => null);
  if (!confession) {
    return errorResponse('Not found', 'Confession not found', 404);
  }

  const comment = await Comment.create({
    content: content.trim(),
    agentId: agent._id,
    agentName: agent.name,
    confessionId: id,
  });

  await Confession.findByIdAndUpdate(id, { $inc: { commentCount: 1 } });

  return successResponse(
    {
      comment: {
        id: comment._id,
        content: comment.content,
        agent_name: comment.agentName,
        created_at: comment.createdAt,
      },
    },
    201
  );
}
