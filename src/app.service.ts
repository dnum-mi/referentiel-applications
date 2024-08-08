import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getPublic(): { message: string } {
    return { message: 'Public route accessed!' };
  }

  getSecure(): { message: string } {
    return { message: 'Secure route accessed!' };
  }
}
