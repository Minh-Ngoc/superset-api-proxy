import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { SupersetApplication } from '../../superset-application/schemas/superset-application.schema';

@Schema({
  timestamps: true,
  collection: 'superset_rls_templates',
  versionKey: false,
})
export class RlsTemplate {
  @Prop({ type: Number, required: true })
  dataset!: number;

  /**
   * SQL clause template.
   * Example: "hierarchy_phone @> ARRAY[{{phone}}]"
   */
  @Prop({ type: String, required: true, trim: true })
  clause!: string;

  @Prop({ type: [String], default: [] })
  variables!: string[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: SupersetApplication.name,
    required: true,
  })
  applicationId!: Types.ObjectId;
}

export const RlsTemplateSchema = SchemaFactory.createForClass(RlsTemplate);
export type RlsTemplateDocument = HydratedDocument<RlsTemplate>;

RlsTemplateSchema.index({ applicationId: 1, dataset: 1 });
RlsTemplateSchema.index({ applicationId: 1 });
