import { IsUUID } from 'class-validator';

export class CreateCompraDto {
  @IsUUID()
  livroId!: string;
}
