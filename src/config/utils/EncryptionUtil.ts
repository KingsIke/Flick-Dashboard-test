/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
// import * as JSEncrypt from 'jsencrypt';
import * as forge from 'node-forge';



@Injectable()
export class EncryptionUtil {
  private readonly publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAm1FVLI5hFw7nQyEQ5vjp
PnLOuEpffYYHh4S7BBpvHEDwTfgpyS8VzZj1oLcgdkKamEsLTGPfr/oDA6kKxEFn
YLz65S8XHpRTLs+JL5wivwuA7aZyx7I6Vod1J/4tDErpqzyusRlSuBHA3Q9jmBzE
oUuNlQvY9zsZ9xpJQquTxq6XkGpUQvBjBbjL0v9m5cxNCmQbkOtETRlM4y8i/TRF
fEmC0S8a50K/uUOkFglr37fddwty36XZriBGfjuyNxxcwMGwXVvZUyRHZc1NtavV
L9eq5orZpDVu4cnZyjN0Ovs7ssfbEy4RTobfnE9qBOPUNL/qN4D7qH1ZXowVBI30
UwIDAQAB
-----END PUBLIC KEY-----`;

  private readonly privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCbUVUsjmEXDudD
IRDm+Ok+cs64Sl99hgeHhLsEGm8cQPBN+CnJLxXNmPWgtyB2QpqYSwtMY9+v+gMD
qQrEQWdgvPrlLxcelFMuz4kvnCK/C4DtpnLHsjpWh3Un/i0MSumrPK6xGVK4EcDd
D2OYHMShS42VC9j3Oxn3GklCq5PGrpeQalRC8GMFuMvS/2blzE0KZBuQ60RNGUzj
LyL9NEV8SYLRLxrnQr+5Q6QWCWvft913C3LfpdmuIEZ+O7I3HFzAwbBdW9lTJEdl
zU21q9Uv16rmitmkNW7hydnKM3Q6+zuyx9sTLhFOht+cT2oE49Q0v+o3gPuofVle
jBUEjfRTAgMBAAECggEAO+YNdY4BVo2qVYK6jIEBHtLS81LHadbXL4XaQ/ZX1Gsc
4czrfImanHw5ej41mDYOfd4vIMpBmZHPOMmn+9EHZ9Dp55oWDfaA8AQcsY5C/i+X
DM/M40PSaM17uq01PVDktePEsUsFUjSSjw5gx+iMUnIbS5hSl+IknN330+zspEnV
b84QB9WhnMME6RGS7ZUgv9FKoSPsQi0i4MVaHu/Iuo5wDF/ABJ+zyOWv5RCmMq8W
zPEfTj+oeDAcuqLEVW8sejvlcRKAabrwdqVcIDT8y6FUcIh1pa/yEpKQBbjYYGwS
M2U46s03tEzCD/4JK18yQCMUIt+9CJ7SAhAKPU1KdQKBgQDbJeQErKS4+jWv9gdI
RzV6slJueAbprsTlnM/zsUMAL7waweQ5OF8J5mr5utlnBR+O+Gx9x9HAoutra3av
fSNk5Po5ZQrGRbm85W0as/9NM33VAXYXaNndNlfeQBNiwO8hpKTXm3R8Kf7LbHMB
Qp4mZcV0usZgwS5FYk1ymV/TzwKBgQC1b5v7q9AB6xf4SO/qUq73H0gWqkpKhdgs
XedaKKO5GRYZNDgS0bXEWjPh4TDjKs/g3D34xWkzk+N3fA2jsOrVmUzWu6AmZq7C
8XnAXPqO6u7mcQ1C952M5NA1r5+VaBMDcB+Y05Yqz37nUFuyLvH+YS8doCPzUbQB
Szkv6hLEPQKBgHYsPIT4w+qrof+837huDbyYJDNFrhSdFbfrk4eJcuPK2dhj7bmd
WEJyagU4aLtQ2++wrnA1LDqAoApQ7LM8+7UQdI42mlTIjJv765WWsnji51vRaei9
tZ3ADCngy5NZDppJuko5ndrGmor/dBSd48I45v1HKmpKQbVQiQrfAfmpAoGANWJQ
f/1up5HXrKsxRD3t0zJ2EI0sbL7y+yLqFoIMokK6WNIfiZIArHRp/ZU3wC9xmNTU
uyTCrnVeIWLz1G0Su6RukmQEXCgsVZmdXDc/VdvUTSOIZmLbDYCprpItH1XO+lz8
PwhKj/Abg84GHOhpNZK8vTfIPCiXESZj/jAeM3UCgYAuCS4KNqtmOzbhbC5jO88G
kiPmJIyfxZO1KLCTjzNeNJjnBRUwz50Eau/kOzTVUAgz7lJWoS5V6kVNGOU8l/QZ
ZTh/TWIcDfMtL1ceClsxwZzK+BLXZ4HWveFD7CEPObt2paywWMwGk2iKsh6OZAfn
1SesFrJAsjlrSvkwuVunWQ==
-----END PRIVATE KEY-----`;

   encrypter(text: string): string {
    const publicKey = forge.pki.publicKeyFromPem(this.publicKey);
    const encrypted = publicKey.encrypt(text, 'RSA-OAEP');
    return forge.util.encode64(encrypted);
  }

  decrypter(encryptedText: string): string {
    const privateKey = forge.pki.privateKeyFromPem(this.privateKey);
    const encryptedBytes = forge.util.decode64(encryptedText);
    const decrypted = privateKey.decrypt(encryptedBytes, 'RSA-OAEP');
    return decrypted;
  }
  


  determinePaymentType(cardNumber: string): 'OTP' | 'PIN' | null {
    // if (cardNumber.startsWith('4111')) {
    //   return 'OTP';
    // } else if (cardNumber.startsWith('5500')) {
    //   return 'PIN';
    // }
     if (cardNumber) {
      return 'OTP';
     }
    return null;
  }
}