import mongoose, { Schema, Document, Types } from 'mongoose';

export type ReactionType = 'heart' | 'laugh' | 'shocked' | 'sad' | 'fire';
export const REACTION_TYPES: ReactionType[] = ['heart', 'laugh', 'shocked', 'sad', 'fire'];
export const CATEGORIES = ['school', 'life', 'relationships', 'tech', 'other'];

export interface IConfession extends Document {
  content: string;
  agentId: Types.ObjectId;
  category: string;
  reactions: {
    heart: number;
    laugh: number;
    shocked: number;
    sad: number;
    fire: number;
  };
  reactedBy: Array<{ agentId: Types.ObjectId; type: ReactionType }>;
  commentCount: number;
}

const ConfessionSchema = new Schema<IConfession>(
  {
    content: { type: String, required: true, maxlength: 500 },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    category: { type: String, enum: CATEGORIES, default: 'other' },
    reactions: {
      heart: { type: Number, default: 0 },
      laugh: { type: Number, default: 0 },
      shocked: { type: Number, default: 0 },
      sad: { type: Number, default: 0 },
      fire: { type: Number, default: 0 },
    },
    reactedBy: [
      {
        agentId: { type: Schema.Types.ObjectId, ref: 'Agent' },
        type: { type: String, enum: REACTION_TYPES },
      },
    ],
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Confession ||
  mongoose.model<IConfession>('Confession', ConfessionSchema);
