import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedRequest, JwtPayload } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException();
    }

    // O token sozinho não basta: a conta pode ter sido desativada ou a senha
    // trocada depois que ele foi emitido (versão da sessão diferente).
    const usuario = await this.prismaService.usuario.findUnique({
      where: { id: payload.sub },
      select: {
        tipoUsuario: true,
        conta: { select: { ativo: true, versaoSessao: true } },
      },
    });
    if (!usuario || !usuario.conta.ativo) {
      throw new UnauthorizedException();
    }
    if ((payload.v ?? 0) !== usuario.conta.versaoSessao) {
      throw new UnauthorizedException();
    }

    // O tipo de usuário vem do banco, não do token.
    request.user = { ...payload, tipoUsuario: usuario.tipoUsuario };
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
