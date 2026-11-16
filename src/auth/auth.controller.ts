import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  AtualizarPerfilDto,
  DesativarContaDto,
  SignInDto,
  SignUpDto,
  TrocarSenhaDto,
} from './dtos/auth';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signup(@Body() body: SignUpDto) {
    return this.authService.signUp(body);
  }

  @Post('signin')
  async signin(@Body() body: SignInDto) {
    return this.authService.signIn(body);
  }

  @UseGuards(AuthGuard)
  @Post('refresh')
  async refresh(@Request() request: AuthenticatedRequest) {
    return this.authService.renovar(request.user.sub);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Request() request: AuthenticatedRequest) {
    return this.authService.me(request.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  async atualizarPerfil(
    @Request() request: AuthenticatedRequest,
    @Body() body: AtualizarPerfilDto,
  ) {
    return this.authService.atualizarPerfil(request.user.sub, body);
  }

  @UseGuards(AuthGuard)
  @Put('senha')
  async trocarSenha(
    @Request() request: AuthenticatedRequest,
    @Body() body: TrocarSenhaDto,
  ) {
    return this.authService.trocarSenha(request.user.sub, body);
  }

  @UseGuards(AuthGuard)
  @Post('desativar')
  @HttpCode(204)
  async desativar(
    @Request() request: AuthenticatedRequest,
    @Body() body: DesativarContaDto,
  ) {
    await this.authService.desativar(request.user.sub, body);
  }
}
