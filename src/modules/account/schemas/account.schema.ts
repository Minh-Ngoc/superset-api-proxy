import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AccountDocument = Account & Document;

@Schema({
  timestamps: true,
  collection: 'accounts',
  versionKey: false,
})
export class Account {
  /**
   * Username phải khớp với username trong Superset.
   * Đây là khoá tham chiếu giữa hệ thống của bạn và Superset.
   */
  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  username!: string;

  /** Tên role, tham chiếu đến Role.name */
  @Prop({ type: String, required: true })
  password!: string;

  /** Tên role, tham chiếu đến Role.name */
  @Prop({ type: String, required: true })
  phone!: string;

  /** Tên role, tham chiếu đến Role.name */
  @Prop({ type: String, required: true })
  roleName!: string;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  /** Thông tin hiển thị tuỳ ý (tên thật, email, phòng ban...) */
  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;
}

export const AccountSchema = SchemaFactory.createForClass(Account);

AccountSchema.index({ username: 1, isActive: 1 });
AccountSchema.index({ roleName: 1, isActive: 1 });
