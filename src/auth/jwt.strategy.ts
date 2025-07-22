/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenEncryptionUtil } from '../config/utils/TokenEncryptionUtil';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService,
    private tokenEncryptionUtil: TokenEncryptionUtil,
    private jwtService: JwtService,
  ) {
    super({
    //   jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          const authHeader = req?.headers?.authorization;
          if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
          const encryptedToken = authHeader.replace('Bearer ', '');
          try {
            const decrypted =  this.tokenEncryptionUtil.decryptToken(encryptedToken);
            return decrypted;
          } catch (err) {
            return null;
          }
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
      passReqToCallback: true,
    });
  }

  async validate(payload: any) {
    return { sub: payload.sub, email: payload.email };
  }
}