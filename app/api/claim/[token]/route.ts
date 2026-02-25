import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await connectDB();
  const { token } = await params;
  const body = await req.json().catch(() => ({}));

  const agent = await Agent.findOne({ claimToken: token });
  if (!agent) {
    return errorResponse('Invalid token', 'Claim token not found or already used', 404);
  }

  if (agent.claimStatus === 'claimed') {
    return successResponse({ message: 'Agent already claimed', agent_name: agent.name });
  }

  agent.claimStatus = 'claimed';
  if (body.email) agent.ownerEmail = body.email;
  await agent.save();

  return successResponse({ message: 'Agent claimed successfully', agent_name: agent.name });
}
