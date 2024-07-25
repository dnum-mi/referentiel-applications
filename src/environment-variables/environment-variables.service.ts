import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvironmentVariablesService {
  constructor(private readonly configService: ConfigService) {}
  public get ValidationDays(): number {
    return +this.configService.get('VALIDATION_DAYS', 730);
  }

  public get RoleValidationDays(): number {
    return +this.configService.get('ROLE_VALIDATION_DAYS', 730);
  }

  public get MaxPerPage(): number {
    return +this.configService.get('MAX_PER_PAGE', 20);
  }

  public get JWTSeceret(): string {
    return this.configService.get(
      'JWT_SECERET',
      '927a490dec58f0acd2dbe65d9140f5279036a40f52680126b9206cb814f88ff1',
    );
  }

  public get DSOToken(): string {
    return this.configService.get(
      'DSO_SECERET',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJBUFBMSSIsIm5hbWUiOiJEU08iLCJpYXQiOjE1MTYyMzkwMjJ9.hBob79fE97VlChR27KFFjTn22OEoEy202TotgfNvntU',
    );
  }

  // public get Passage2Server(): string {
  //   return this.configService.get('PASSAGE_2_SERVER', 'ldap://192.168.1.30');
  // }
}
