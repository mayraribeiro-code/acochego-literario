import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignInDto, SignUpDto } from './dtos/auth';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { TipoUsuario } from '@prisma/client';
import { JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  private userAlreadyExist(email: string) {
    return this.prismaService.conta.findUnique({
      where: {
        email: email,
      },
      include: {
        usuario: true,
      },
    });
  }

  async signUp(data: SignUpDto) {
    if (await this.userAlreadyExist(data.email)) {
      throw new UnauthorizedException('User already exist');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prismaService.usuario.create({
      data: {
        nome: data.name,
        tipoUsuario: TipoUsuario.comum,
        conta: {
          create: {
            email: data.email,
            senhaHash: hashedPassword,
          },
        },
      },
      include: {
        conta: true,
      },
    });
    return this.gerarToken(user);
  }

  async signIn(data: SignInDto) {
    const conta = await this.prismaService.conta.findUnique({
      where: {
        email: data.email,
      },
      include: {
        usuario: true,
      },
    });

    if (!conta || !conta.usuario) {
      throw new UnauthorizedException('credentials are not valid');
    }

    if (!conta.ativo) {
      throw new UnauthorizedException('User is not active');
    }

    const passwordMatch = await bcrypt.compare(data.password, conta.senhaHash);

    if (!passwordMatch) {
      throw new UnauthorizedException('credentials are not valid');
    }

    const tokens = this.gerarToken(conta.usuario);

    return { accessToken: tokens.accessToken };
  }

  async me(userId: string) {
    const user = await this.prismaService.usuario.findUnique({
      where: {
        id: userId,
      },
      include: {
        conta: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { senhaHash, ...userWithoutPassword } = user.conta;

    return {
      ...user,
      conta: userWithoutPassword,
    };
  }

  // Troca um token ainda válido por um novo, com o prazo renovado. O site chama
  // isso enquanto está sendo usado, para ninguém ser deslogado no meio da
  // leitura. Consulta o banco de novo: conta desativada ou apagada não renova,
  // e o tipo de usuário sai do banco, não do token antigo.
  async renovar(usuarioId: string) {
    const usuario = await this.prismaService.usuario.findUnique({
      where: { id: usuarioId },
      include: { conta: { select: { ativo: true } } },
    });

    if (!usuario) {
      throw new UnauthorizedException('User not found');
    }
    if (!usuario.conta.ativo) {
      throw new UnauthorizedException('User is not active');
    }

    return this.gerarToken(usuario);
  }

  private gerarToken(usuario: { id: string; tipoUsuario: TipoUsuario }) {
    const payload: JwtPayload = {
      sub: usuario.id,
      tipoUsuario: usuario.tipoUsuario,
    };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
