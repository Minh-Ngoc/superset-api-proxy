import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SupersetService } from './superset.service';
import { SupersetLoginDto } from './dto/superset-login.dto';
import { GetGuestTokenDto } from './dto/get-guest-token.dto';

@ApiTags('Superset Auth')
@Controller('superset')
export class SupersetController {
  constructor(
    private readonly supersetService: SupersetService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy Access Token để nhúng Superset Dashboard',
    description:
      'Xác thực với Superset và trả về guestToken, csrfToken, accessToken để client dùng với Embedded SDK.',
  })
  @ApiOkResponse({ description: 'Trả về các token cần thiết cho iframe embed' })
  @ApiUnauthorizedResponse({ description: 'Sai credentials' })
  fetchGuestToken(@Body() dto: SupersetLoginDto) {
    return this.supersetService.login(dto);
  }

  // @UseGuards(AuthGuard)
  @Post('guest-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy Guest Token để nhúng Superset Dashboard',
    description:
      'Xác thực với Superset và trả về guestToken để client dùng với Embedded SDK.',
  })
  @ApiOkResponse({ description: 'Trả về các token cần thiết cho iframe embed' })
  @ApiUnauthorizedResponse({ description: 'Sai credentials' })
  getGuestToken(
    @Body() dto: GetGuestTokenDto,
    // @CurrentUser() headers: CurrentUserPayload,
    @Res() res: any,
  ) {
    return this.supersetService.getGuestToken(dto, res);
  }
}
