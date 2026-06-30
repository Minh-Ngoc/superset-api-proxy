import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { SupersetApplication } from '../../superset-application/schemas/superset-application.schema';
import { RlsTemplate } from '../../superset-rls-template/schemas/rls-template.schema';

@Schema({
  timestamps: true,
  collection: 'superset_dashboards',
  versionKey: false,
})
export class SupersetDashboard {
  @Prop({ type: String, required: true, trim: true })
  embeddedId!: string;

  @Prop({ type: String, required: true, trim: true })
  route!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: SupersetApplication.name,
    required: true,
  })
  applicationId!: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: RlsTemplate.name }],
    default: [],
  })
  rlsTemplateIds!: Types.ObjectId[];
}

export const SupersetDashboardSchema =
  SchemaFactory.createForClass(SupersetDashboard);
export type SupersetDashboardDocument = HydratedDocument<SupersetDashboard>;

SupersetDashboardSchema.index({ embeddedId: 1 });
SupersetDashboardSchema.index({ applicationId: 1, route: 1 });
SupersetDashboardSchema.index({ applicationId: 1, isActive: 1 });
SupersetDashboardSchema.index({ rlsTemplateIds: 1 });
