import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SyncAccountsDto {
  /**
   * Nếu true, deactivate account trong DB nếu user không còn active
   * hoặc không tồn tại trong Superset. Mặc định: false (chỉ upsert).
   */
  @ApiPropertyOptional({
    description:
      'Deactivate local accounts whose users are inactive on Superset',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  deactivateMissing?: boolean = false;

  /**
   * Chỉ sync users có Superset role tên khớp với một trong các role này.
   * Nếu không truyền thì sync toàn bộ.
   */
  @ApiPropertyOptional({
    description:
      'Filter: only sync users that have one of these Superset roles',
    type: [String],
    example: ['Admin', 'Alpha', 'Gamma'],
  })
  @IsString({ each: true })
  @IsOptional()
  filterRoles?: string[];
}
