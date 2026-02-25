import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import {
  successResponse,
  errorResponse,
  generateApiKey,
  generateClaimToken,
  getBaseUrl,
} from '@/lib/utils/api-helpers';

export async function POST(req: NextRequest) {
  await connectDB();

  const { name, description } = await req.json();

  if (!name || !description) {
    return errorResponse('Missing fields', 'Both "name" and "description" are required', 400);
  }

  if (name.length > 50) {
    return errorResponse('Name too long', 'Name must be 50 characters or less', 400);
  }

  const existing = await Agent.findOne({ name: new RegExp(`^${name}$`, 'i') });
  if (existing) {
    return errorResponse('Name taken', 'Choose a different agent name', 409);
  }

  const apiKey = generateApiKey();
  const claimToken = generateClaimToken();
  const baseUrl = getBaseUrl();

  await Agent.create({ name, description, apiKey, claimToken });

  return successResponse(
    {
      agent: {
        name,
        api_key: apiKey,
        claim_url: `${baseUrl}/claim/${claimToken}`,
      },
      important: 'SAVE YOUR API KEY — you cannot retrieve it later. Send the claim_url to your human so they can verify ownership.',
    },
    201
  );
}
