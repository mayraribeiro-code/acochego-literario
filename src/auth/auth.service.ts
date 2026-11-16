import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AtualizarPerfilDto,
  DesativarContaDto,
  SignInDto,
  SignUpDto,
  TrocarSenhaDto,
} from './dtos/auth';
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
    return this.gerarToken(user, user.conta.versaoSessao);
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

    const tokens = this.gerarToken(conta.usuario, conta.versaoSessao);

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
      include: { conta: { select: { ativo: true, versaoSessao: true } } },
    });

    if (!usuario) {
      throw new UnauthorizedException('User not found');
    }
    if (!usuario.conta.ativo) {
      throw new UnauthorizedException('User is not active');
    }

    return this.gerarToken(usuario, usuario.conta.versaoSessao);
  }

  async atualizarPerfil(usuarioId: string, dados: AtualizarPerfilDto) {
    await this.prismaService.usuario.update({
      where: { id: usuarioId },
      data: { nome: dados.nome.trim() },
    });
    return this.me(usuarioId);
  }

  // Troca a senha e invalida os tokens antigos (as sessões em outros
  // aparelhos caem). Quem trocou recebe um token novo para continuar logado.
  async trocarSenha(usuarioId: string, dados: TrocarSenhaDto) {
    const usuario = await this.buscarComConta(usuarioId);

    if (!(await bcrypt.compare(dados.senhaAtual, usuario.conta.senhaHash))) {
      throw new BadRequestException('A senha atual está incorreta');
    }
    if (dados.senhaAtual === dados.novaSenha) {
      throw new BadRequestException('A nova senha deve ser diferente da atual');
    }

    await this.prismaService.conta.update({
      where: { id: usuario.contaId },
      data: {
        senhaHash: await bcrypt.hash(dados.novaSenha, 10),
        versaoSessao: { increment: 1 },
      },
    });

    return this.gerarToken(usuario, usuario.conta.versaoSessao + 1);
  }

  // A conta não é apagada: fica desativada, o login é recusado e as compras
  // continuam registradas. O admin não pode se desativar, para o painel não
  // ficar sem nenhum administrador.
  async desativar(usuarioId: string, dados: DesativarContaDto) {
    const usuario = await this.buscarComConta(usuarioId);

    if (usuario.tipoUsuario === TipoUsuario.admin) {
      throw new ForbiddenException(
        'A conta de administrador não pode ser desativada',
      );
    }
    if (!(await bcrypt.compare(dados.senha, usuario.conta.senhaHash))) {
      throw new BadRequestException('Senha incorreta');
    }

    await this.prismaService.conta.update({
      where: { id: usuario.contaId },
      data: { ativo: false },
    });
  }

  private async buscarComConta(usuarioId: string) {
    const usuario = await this.prismaService.usuario.findUnique({
      where: { id: usuarioId },
      include: { conta: true },
    });
    if (!usuario) {
      throw new UnauthorizedException('User not found');
    }
    return usuario;
  }

  private gerarToken(
    usuario: { id: string; tipoUsuario: TipoUsuario },
    versaoSessao: number,
  ) {
    const payload: JwtPayload = {
      sub: usuario.id,
      tipoUsuario: usuario.tipoUsuario,
      v: versaoSessao,
    };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
