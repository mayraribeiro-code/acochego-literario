import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CartaoDto {
  // Só dígitos (o site tira os espaços antes de enviar).
  @Matches(/^\d{13,19}$/, { message: 'Número de cartão inválido' })
  numero!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nomeTitular!: string;
  @IsInt()
  @Min(1)
  @Max(12)
  mesValidade!: number;
  @IsInt()
  @Min(2000)
  @Max(2100)
  anoValidade!: number;
  @Matches(/^\d{3,4}$/, { message: 'CVV inválido' })
  cvv!: string;
}

export class CreateCompraDto {
  @IsUUID()
  livroId!: string;
  // "cartao" (padrão) ou "pix". Livros gratuitos ignoram.
  @IsOptional()
  @IsIn(['cartao', 'pix'])
  metodo?: 'cartao' | 'pix';
  // Obrigatório para pagar com cartão um livro pago.
  @IsOptional()
  @ValidateNested()
  @Type(() => CartaoDto)
  cartao?: CartaoDto;
}
