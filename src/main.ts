/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableCors({
    origin: ['http://localhost:3000', 'https://f88e4824e50b.ngrok-free.app'],
    credentials: true, 
  });
  await app.listen(3000);
}
bootstrap();
