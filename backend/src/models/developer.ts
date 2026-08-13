import mongoose, { Schema, Document } from 'mongoose';

export interface IDeveloperDocument extends Document {
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeveloperSchema = new Schema<IDeveloperDocument>(
  {
    name: { 
      type: String, 
      required: [true, 'Developer name is required'], 
      trim: true,
      minlength: [1, 'Name cannot be empty']
    },
    description: { 
      type: String, 
      default: '', 
      trim: true 
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        const r = ret as any;
        r.id = r._id.toString();
        r.type = 'DEVELOPER'; // Inject type for API response consistency
        delete r._id;
        delete r.__v;
        return r;
      }
    }
  }
);

export const DeveloperModel = mongoose.model<IDeveloperDocument>('Developer', DeveloperSchema);
