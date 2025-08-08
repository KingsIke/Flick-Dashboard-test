/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../infrastructure/repositories/user.repository';
import { TokenEncryptionUtil } from '../config/utils/TokenEncryptionUtil';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private tokenEncryptionUtil: TokenEncryptionUtil,
    private jwtService: JwtService,
    private userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          const authHeader = req?.headers?.authorization;
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('JWT Strategy - Missing or invalid Authorization header:', authHeader);
            return null;
          }
          const encryptedToken = authHeader.replace('Bearer ', '');
          try {
            const decrypted = this.tokenEncryptionUtil.decryptToken(encryptedToken);
            console.log('JWT Strategy - Decrypted token:', decrypted);
            return decrypted;
          } catch (err) {
            console.error('JWT Strategy - Decryption failed:', err.message);
            return null;
          }
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    console.log('JWT Strategy - Validating payload:', payload);
    if (!payload.sub) {
      console.error('JWT Strategy - Missing sub in payload');
      throw new UnauthorizedException('Invalid token payload');
    }
    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user) {
      console.error('JWT Strategy - User not found for ID:', payload.sub);
      throw new UnauthorizedException('User not found');
    }
    console.log('JWT Strategy - Validated User:', { sub: user.id, email: user.email });
    return { sub: user.id, email: user.email };
  }
}        