import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { LivrosModule } from './livros/livros.module';
import { ComprasModule } from './compras/compras.module';
import { ArquivosModule } from './arquivos/arquivos.module';
import { PrismaService } from './prisma/prisma.service';
import { envValidationSchema } from './config/env.validation';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    AuthModule,
    LivrosModule,
    ComprasModule,
    ArquivosModule,
  ],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
