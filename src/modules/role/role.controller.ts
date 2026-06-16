import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleService } from '../role/role.service';
import { CreateRoleDto } from '../role/dto/create-role.dto';
import { UpdateRoleDto } from '../role/dto/update-role.dto';
import { GrantDashboardDto } from './dto/grant-dashboard.dto';
import { Role } from '../role/schemas/role.schema';

@ApiTags('roles')
@Controller('roles')
// @UseGuards(JwtAuthGuard) // bảo vệ trong production
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // ─── CRUD ──────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Tạo role mới' })
  @ApiResponse({ status: 201, description: 'Role đã được tạo.' })
  @ApiResponse({ status: 409, description: 'Role name đã tồn tại.' })
  async create(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.roleService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách roles' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Bao gồm cả roles không active',
  })
  async findAll(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<Role[]> {
    return this.roleService.findAll(includeInactive === 'true');
  }

  @Get(':name')
  @ApiOperation({ summary: 'Lấy chi tiết một role theo name' })
  @ApiParam({ name: 'name', example: 'analyst' })
  @ApiResponse({ status: 404, description: 'Role không tồn tại.' })
  async findOne(@Param('name') name: string): Promise<Role> {
    return this.roleService.findByName(name);
  }

  @Put(':name')
  @ApiOperation({
    summary: 'Cập nhật role',
    description:
      'Update các field của role. Không dùng để thay đổi dashboardPermissions — dùng grant/revoke thay thế.',
  })
  @ApiParam({ name: 'name', example: 'analyst' })
  @ApiResponse({ status: 404, description: 'Role không tồn tại.' })
  async update(
    @Param('name') name: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<Role> {
    return this.roleService.update(name, dto);
  }

  @Delete(':name')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate role (soft delete)' })
  @ApiParam({ name: 'name', example: 'analyst' })
  async deactivate(@Param('name') name: string): Promise<void> {
    return this.roleService.deactivate(name);
  }

  // ─── Dashboard Permissions ──────────────────────────────────────────────

  /**
   * POST /roles/:name/dashboards
   *
   * Grant quyền truy cập một dashboard cho role, kèm RLS rules tuỳ chọn.
   * Nếu role đã có permission cho dashboard đó → update (upsert).
   *
   * Đây là endpoint chính để thiết lập dashboardPermissions sau khi sync roles.
   */
  @Post(':name/dashboards')
  @ApiOperation({
    summary: 'Grant dashboard access cho role',
    description: `
Thêm hoặc cập nhật quyền truy cập một dashboard cho role.

- Nếu \`rlsRules\` để trống → role xem được toàn bộ data của dashboard đó.
- Nếu có \`rlsRules\` → Superset inject các clause này vào guest token,
  lọc data theo row-level.

Gọi endpoint này sau \`POST /sync/all\` để thiết lập permission cho từng role.
    `.trim(),
  })
  @ApiParam({ name: 'name', description: 'Role name', example: 'alpha' })
  @ApiResponse({ status: 201, description: 'Permission đã được grant.' })
  @ApiResponse({ status: 404, description: 'Role không tồn tại.' })
  async grantDashboard(
    @Param('name') name: string,
    @Body() dto: GrantDashboardDto,
  ): Promise<Role> {
    return this.roleService.grantDashboardAccess(name, {
      embeddedId: dto.embeddedId,
      rlsRules: dto.rlsRules ?? [],
    });
  }

  /**
   * DELETE /roles/:name/dashboards/:embeddedId
   *
   * Revoke quyền truy cập một dashboard khỏi role.
   */
  @Delete(':name/dashboards/:embeddedId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke dashboard access khỏi role',
    description:
      'Xoá permission của role đối với dashboard. Sau khi revoke, user thuộc role này sẽ nhận ForbiddenException khi truy cập dashboard đó.',
  })
  @ApiParam({ name: 'name', description: 'Role name', example: 'alpha' })
  @ApiParam({
    name: 'embeddedId',
    description: 'embeddedId của dashboard',
    example: '25146715-1e0e-4caf-9e25-51f93c3411ef',
  })
  @ApiResponse({ status: 200, description: 'Permission đã được revoke.' })
  @ApiResponse({ status: 404, description: 'Role không tồn tại.' })
  async revokeDashboard(
    @Param('name') name: string,
    @Param('embeddedId') embeddedId: string,
  ): Promise<Role> {
    return this.roleService.revokeDashboardAccess(name, embeddedId);
  }
}
