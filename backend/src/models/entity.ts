import mongoose, { Schema, Document } from 'mongoose';
import { EntityType } from '../types/index.js';

export interface IEntityDocument extends Document {
  type: EntityType;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const EntitySchema = new Schema<IEntityDocument>(
  {
    type: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: {
        values: ['PROJECT', 'FEATURE', 'SERVICE', 'DEVELOPER'],
        message: '{VALUE} is not a valid EntityType'
      }
    },
    name: {
      type: String,
      required: [true, 'Entity name is required'],
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
        delete r._id;
        delete r.__v;
        return r;
      }
    }
  }
);

export const EntityModel = mongoose.model<IEntityDocument>('Entity', EntitySchema);
