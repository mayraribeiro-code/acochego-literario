import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export const SENHA_MINIMA = 8;

export class SignUpDto {
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
  @IsEmail()
  email!: string;
  @MinLength(SENHA_MINIMA)
  password!: string;
}

export class SignInDto {
  @IsEmail()
  email!: string;
  @IsNotEmpty()
  password!: string;
}

export class AtualizarPerfilDto {
  @IsNotEmpty()
  @MaxLength(100)
  nome!: string;
}

export class TrocarSenhaDto {
  @IsNotEmpty()
  senhaAtual!: string;
  @MinLength(SENHA_MINIMA)
  novaSenha!: string;
}

// Pede a senha de novo para confirmar que é o dono da conta.
export class DesativarContaDto {
  @IsNotEmpty()
  senha!: string;
}
