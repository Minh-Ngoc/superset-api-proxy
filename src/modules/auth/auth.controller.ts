import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  
  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Login...' })
  @ApiCreatedResponse()
  async login(@Body() dto: LoginDto){
    return this.authService.login(dto);
  }
}
