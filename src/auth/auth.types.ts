import { TipoUsuario } from '@prisma/client';
import { Request } from 'express';

// Dados guardados dentro do token JWT.
export interface JwtPayload {
  sub: string;
  tipoUsuario: TipoUsuario;
  // Versão da sessão da conta; muda quando a senha é trocada.
  // Tokens antigos, emitidos antes deste campo existir, valem como versão 0.
  v?: number;
}

// Requisição que já passou pelo AuthGuard: o usuário do token fica em request.user.
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
