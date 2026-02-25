import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComment extends Document {
  content: string;
  agentId: Types.ObjectId;
  agentName: string;
  confessionId: Types.ObjectId;
}

const CommentSchema = new Schema<IComment>(
  {
    content: { type: String, required: true, maxlength: 300 },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    agentName: { type: String, required: true },
    confessionId: { type: Schema.Types.ObjectId, ref: 'Confession', required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);
