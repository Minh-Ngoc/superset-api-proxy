import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum SupersetApplicationEnv {
  Dev = 'dev',
  Production = 'production',
}

@Schema({
  timestamps: true,
  collection: 'superset_applications',
  versionKey: false,
})
export class SupersetApplication {
  @Prop({ type: String, required: true, trim: true })
  url!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({
    type: String,
    enum: Object.values(SupersetApplicationEnv),
    required: true,
  })
  env!: SupersetApplicationEnv;
}

export const SupersetApplicationSchema =
  SchemaFactory.createForClass(SupersetApplication);
export type SupersetApplicationDocument = HydratedDocument<SupersetApplication>;

SupersetApplicationSchema.index({ name: 1, env: 1 }, { unique: true });
SupersetApplicationSchema.index({ env: 1, isActive: 1 });
