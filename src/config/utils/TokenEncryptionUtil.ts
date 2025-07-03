/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class TokenEncryptionUtil {
  private algorithm = 'aes-256-cbc';
  private secretKey: Buffer;
  private iv: Buffer;

  constructor(private configService: ConfigService) {
    const passphrase = this.configService.get<string>('TOKEN_PASSPHRASE', 'your_super_secret_passphrase');
    const salt = this.configService.get<string>('TOKEN_SALT', 'salt');
    this.secretKey = crypto.scryptSync(passphrase, salt, 32);
    this.iv = crypto.randomBytes(16);
  }

  encryptToken(token: string): string {
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, this.iv);
    let encrypted = cipher.update(token, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return `sk-${this.iv.toString('base64')}.${encrypted}`;
  }

  decryptToken(encryptedToken: string): string {
    const [ivBase64, encryptedData] = encryptedToken.replace(/^sk-/, '').split('.');
    const iv = Buffer.from(ivBase64, 'base64');
    const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}