/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DashboardPermission, Role, RoleDocument } from './schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

export interface PermissionCheckResult {
  granted: boolean;
  rlsRules: { clause: string; dataset: number }[];
}

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    try {
      const role = new this.roleModel(dto);
      const saved = await role.save();
      this.logger.log(`Role created: ${saved.name}`);
      return saved.toObject();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(`Role '${dto.name}' đã tồn tại`);
      }
      throw error;
    }
  }

  async findAll(includeInactive = false): Promise<Role[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return this.roleModel.find(filter).lean().exec();
  }

  async findByName(name: string): Promise<Role> {
    const role = await this.roleModel
      .findOne({ name: name.toLowerCase(), isActive: true })
      .lean()
      .exec();

    if (!role) {
      throw new NotFoundException(
        `Role '${name}' không tồn tại hoặc không được kích hoạt`,
      );
    }

    return role;
  }

  /**
   * Kiểm tra role có quyền truy cập dashboard không.
   *
   * - isSuperAdmin=true → luôn pass, không cần khai báo permission.
   * - isSuperAdmin=false → phải có entry trong dashboardPermissions.
   *
   * @returns rlsRules áp dụng cho cặp (role, dashboard) này
   */
  async assertDashboardAccess(
    roleName: string,
    embeddedId: string,
  ): Promise<PermissionCheckResult> {
    const role = await this.findByName(roleName);

    if (role.isSuperAdmin) {
      this.logger.log(
        `[Permission] GRANTED (superAdmin): role=${roleName}, dashboard=${embeddedId}`,
      );
      return { granted: true, rlsRules: [] };
    }

    const permission = role.dashboardPermissions.find(
      (p) => p.embeddedId === embeddedId,
    );

    if (!permission) {
      this.logger.warn(
        `[Permission] DENIED: role=${roleName}, dashboard=${embeddedId}`,
      );
      throw new ForbiddenException(
        `Role '${roleName}' không có quyền truy cập dashboard này`,
      );
    }

    this.logger.log(
      `[Permission] GRANTED: role=${roleName}, dashboard=${embeddedId}, rls=${permission.rlsRules.length} rules`,
    );

    return { granted: true, rlsRules: permission.rlsRules };
  }

  /**
   * Thêm hoặc cập nhật quyền truy cập 1 dashboard cho role.
   * Dùng để grant access mà không cần update toàn bộ role.
   */
  async grantDashboardAccess(
    roleName: string,
    permission: DashboardPermission,
  ): Promise<Role> {
    const role = await this.roleModel
      .findOneAndUpdate(
        {
          name: roleName.toLowerCase(),
          'dashboardPermissions.embeddedId': {
            $ne: permission.embeddedId,
          },
        },
        { $push: { dashboardPermissions: permission } },
        { new: true },
      )
      .lean()
      .exec();

    // Nếu đã tồn tại → update (upsert pattern)
    if (!role) {
      const updated = await this.roleModel
        .findOneAndUpdate(
          {
            name: roleName.toLowerCase(),
            'dashboardPermissions.embeddedId': permission.embeddedId,
          },
          { $set: { 'dashboardPermissions.$': permission } },
          { new: true },
        )
        .lean()
        .exec();

      if (!updated) {
        throw new NotFoundException(`Role '${roleName}' không tồn tại`);
      }

      return updated;
    }

    this.logger.log(
      `[Permission] Granted: role=${roleName}, dashboard=${permission.embeddedId}`,
    );

    return role;
  }

  /**
   * Revoke quyền truy cập 1 dashboard khỏi role.
   */
  async revokeDashboardAccess(
    roleName: string,
    embeddedId: string,
  ): Promise<Role> {
    const role = await this.roleModel
      .findOneAndUpdate(
        { name: roleName.toLowerCase() },
        {
          $pull: {
            dashboardPermissions: { embeddedId },
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' không tồn tại`);
    }

    this.logger.warn(
      `[Permission] Revoked: role=${roleName}, dashboard=${embeddedId}`,
    );

    return role;
  }

  async update(name: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.roleModel
      .findOneAndUpdate(
        { name: name.toLowerCase() },
        { $set: dto },
        { new: true },
      )
      .lean()
      .exec();

    if (!role) {
      throw new NotFoundException(`Role '${name}' không tồn tại`);
    }

    return role;
  }

  async deactivate(name: string): Promise<void> {
    await this.update(name, { isActive: false });
    this.logger.warn(`Role deactivated: ${name}`);
  }
}
