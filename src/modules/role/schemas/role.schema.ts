import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoleDocument = Role & Document;

/** Permission của một role đối với 1 dashboard cụ thể */
@Schema({ _id: false })
export class DashboardPermission {
  /** embeddedId của dashboard được phép truy cập */
  @Prop({ required: true })
  embeddedId!: string;

  /**
   * RLS rules dành riêng cho role này trên dashboard này.
   * Override hoàn toàn rlsRules mặc định trên Dashboard schema.
   * Ví dụ: [{ clause: "region = 'APAC'", dataset: 1 }]
   */
  @Prop({ type: [{ clause: String, dataset: Number }], default: [] })
  rlsRules!: { clause: string; dataset: number }[];
}

export const DashboardPermissionSchema =
  SchemaFactory.createForClass(DashboardPermission);

@Schema({
  timestamps: true,
  collection: 'roles',
  versionKey: false,
})
export class Role {
  /** Tên role duy nhất, dùng làm key tham chiếu từ Account */
  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  name!: string;

  @Prop({ type: String, required: true, trim: true })
  displayName!: string;

  /**
   * Super admin: bỏ qua mọi kiểm tra quyền dashboard.
   * Dùng rlsRules từ Dashboard schema (nếu có).
   */
  @Prop({ type: Boolean, default: false })
  isSuperAdmin!: boolean;

  /**
   * Danh sách dashboard + RLS rules mà role này được phép truy cập.
   * - Rỗng + isSuperAdmin=false → không truy cập được dashboard nào.
   * - isSuperAdmin=true → truy cập tất cả.
   */
  @Prop({ type: [DashboardPermissionSchema], default: [] })
  dashboardPermissions!: DashboardPermission[];

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

RoleSchema.index({ name: 1, isActive: 1 });
