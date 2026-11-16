import { FormatoArquivo } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SalvarProgressoDto {
  @IsEnum(FormatoArquivo)
  formato!: FormatoArquivo;
  // Página do PDF ("12") ou CFI do EPUB ("epubcfi(/6/4!/4/2/1:0)").
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  posicao!: string;
  @IsInt()
  @Min(0)
  @Max(100)
  percentual!: number;
}
