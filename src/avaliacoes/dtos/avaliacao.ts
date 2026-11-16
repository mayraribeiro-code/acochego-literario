import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SalvarAvaliacaoDto {
  @IsInt()
  @Min(1)
  @Max(5)
  nota!: number;
  // Comentário em branco é tratado como "sem comentário".
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comentario?: string;
}
