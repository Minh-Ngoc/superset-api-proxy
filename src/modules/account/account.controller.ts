import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account } from './schemas/account.schema';

@ApiTags('Accounts')
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo account mới (mapping với Superset user)' })
  @ApiCreatedResponse()
  async create(@Body() dto: CreateAccountDto): Promise<Account> {
    return this.accountService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách accounts, tuỳ chọn lọc theo role' })
  @ApiOkResponse()
  async findAll(
    @Query('roleName') roleName?: string,
    @Query('isActive') isActive?: string,
  ): Promise<Account[]> {
    return this.accountService.findAll({
      roleName,
      isActive: isActive !== undefined ? isActive !== 'false' : undefined,
    });
  }

  @Get(':username')
  @ApiOperation({ summary: 'Lấy account theo username' })
  async findOne(@Param('username') username: string): Promise<Account> {
    return this.accountService.findByUsername(username);
  }

  @Patch(':username')
  @ApiOperation({ summary: 'Cập nhật thông tin account' })
  async update(
    @Param('username') username: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<Account> {
    return this.accountService.update(username, dto);
  }

  @Patch(':username/role')
  @ApiOperation({ summary: 'Đổi role cho account' })
  async changeRole(
    @Param('username') username: string,
    @Body() body: { roleName: string },
  ): Promise<Account> {
    return this.accountService.changeRole(username, body.roleName);
  }

  @Patch(':username/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Vô hiệu hoá account (soft delete)' })
  @ApiNoContentResponse()
  async deactivate(@Param('username') username: string): Promise<void> {
    return this.accountService.deactivate(username);
  }

  @Delete(':username')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa vĩnh viễn account' })
  @ApiNoContentResponse()
  async remove(@Param('username') username: string): Promise<void> {
    return this.accountService.remove(username);
  }
}
