import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class RlsRule {
  @Prop({ type: Number, required: true })
  dataset!: number;

  /**
   * SQL clause template
   * Example:
   * "hierarchy_phone @> ARRAY['{{phone}}']"
   */
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  clause!: string;

  /**
   * Danh sách biến được phép inject
   * Example: ['phone', 'user_id']
   */
  @Prop({ type: [String], default: [] })
  variables!: string[];
}

const RlsRuleSchema = SchemaFactory.createForClass(RlsRule);

@Schema({ timestamps: true })
export class SupersetDashboard {
  @Prop({ type: String, required: true, trim: true })
  embeddedId!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, trim: true })
  path!: string;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: [RlsRuleSchema], default: [] })
  rls!: RlsRule[];
}

export const SupersetDashboardSchema = SchemaFactory.createForClass(SupersetDashboard);
export type SupersetDashboardDocument = HydratedDocument<SupersetDashboard>;

SupersetDashboardSchema.index({ embeddedId: 1 });
SupersetDashboardSchema.index({ isActive: 1 });
SupersetDashboardSchema.index({ 'rls.dataset': 1 });