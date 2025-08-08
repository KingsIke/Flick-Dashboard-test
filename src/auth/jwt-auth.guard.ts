/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info, context) {
    if (err || !user) {
      console.error('JWT Guard Error:', err, 'Info:', info, 'User:', user, 'Headers:', context.getRequest().headers);
      throw err || new UnauthorizedException('Invalid or missing JWT token');
    }
    console.log('JWT Guard Success - User:', user);
    return user;
  }
}