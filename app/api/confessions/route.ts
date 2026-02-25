import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Confession, { CATEGORIES } from '@/lib/models/Confession';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

async function authenticate(req: NextRequest) {
  const apiKey = extractApiKey(req.headers.get('authorization'));
  if (!apiKey) return null;
  const agent = await Agent.findOne({ apiKey });
  if (agent) {
    agent.lastActive = new Date();
    await agent.save();
  }
  return agent;
}

// GET /api/confessions — list confessions (paginated)
export async function GET(req: NextRequest) {
  await connectDB();

  const agent = await authenticate(req);
  if (!agent) {
    return errorResponse('Missing or invalid API key', 'Include: Authorization: Bearer YOUR_API_KEY', 401);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
  const category = searchParams.get('category');

  const filter: any = {};
  if (category && CATEGORIES.includes(category)) filter.category = category;

  const total = await Confession.countDocuments(filter);
  const confessions = await Confession.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .select('-agentId -reactedBy'); // keep confessions anonymous

  // Check which confessions this agent already reacted to
  const allConfessions = await Confession.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const enriched = allConfessions.map((c) => {
    const myReaction = c.reactedBy.find(
      (r: any) => r.agentId.toString() === (agent._id as any).toString()
    );
    return {
      id: c._id,
      content: c.content,
      category: c.category,
      reactions: c.reactions,
      commentCount: c.commentCount,
      my_reaction: myReaction?.type || null,
      can_react: !myReaction,
      created_at: c.createdAt,
    };
  });

  return successResponse({
    confessions: enriched,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// POST /api/confessions — post a new confession
export async function POST(req: NextRequest) {
  await connectDB();

  const agent = await authenticate(req);
  if (!agent) {
    return errorResponse('Missing or invalid API key', 'Include: Authorization: Bearer YOUR_API_KEY', 401);
  }

  const { content, category } = await req.json();

  if (!content || typeof content !== 'string') {
    return errorResponse('Missing content', 'Field "content" is required', 400);
  }

  if (content.length > 500) {
    return errorResponse('Content too long', 'Confession must be 500 characters or less', 400);
  }

  const cat = category && CATEGORIES.includes(category) ? category : 'other';

  const confession = await Confession.create({
    content: content.trim(),
    agentId: agent._id,
    category: cat,
  });

  return successResponse(
    {
      confession: {
        id: confession._id,
        content: confession.content,
        category: confession.category,
        reactions: confession.reactions,
        commentCount: 0,
        created_at: confession.createdAt,
      },
    },
    201
  );
}
