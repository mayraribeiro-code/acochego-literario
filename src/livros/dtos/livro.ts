import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsHexColor,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export const FORMATOS = ['PDF', 'EPUB', 'PDF + EPUB'] as const;

export class CreateLivroDto {
  @IsNotEmpty()
  titulo!: string;
  @IsNotEmpty()
  sinopse!: string;
  // Autor e gênero são informados pelo nome; se ainda não existirem, são criados.
  @IsNotEmpty()
  autor!: string;
  @IsNotEmpty()
  genero!: string;
  @IsInt()
  @Min(0)
  @Max(9999)
  ano!: number;
  @IsInt()
  @Min(0)
  precoCentavos!: number;
  @IsIn(FORMATOS)
  formato!: string;
  @IsOptional()
  @IsBoolean()
  disponivel?: boolean;
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
  @IsHexColor()
  capaCorInicio!: string;
  @IsHexColor()
  capaCorFim!: string;
  @IsHexColor()
  capaCorTexto!: string;
}

export class UpdateLivroDto extends PartialType(CreateLivroDto) {}
