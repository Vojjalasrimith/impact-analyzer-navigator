import mongoose, { Schema, Document } from 'mongoose';

export interface IFeatureDocument extends Document {
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureSchema = new Schema<IFeatureDocument>(
  {
    name: { 
      type: String, 
      required: [true, 'Feature name is required'], 
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
        r.type = 'FEATURE'; // Inject type for API response consistency
        delete r._id;
        delete r.__v;
        return r;
      }
    }
  }
);

export const FeatureModel = mongoose.model<IFeatureDocument>('Feature', FeatureSchema);
