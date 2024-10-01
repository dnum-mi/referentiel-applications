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
    return +this.configService.get('MAX_PER_PAGE', 5);
  }

  public get JWTSeceret(): string {
    return this.configService.get('RDA_JWT_SECRET', '');
  }

  public get DSOToken(): string {
    return this.configService.get('RDA_DSO_SECRET', '');
  }

  public get CDPToken(): string {
    return this.configService.get('RDA_CDP_SECRET', '');
  }

  public get Email(): string {
    return this.configService.get('RDA_EMAIL', 'testauth001.canel@interieur.gouv.fr');
  }

  // public get Passage2Server(): string {
  //   return this.configService.get('PASSAGE_2_SERVER', 'ldap://192.168.1.30');
  // }
}
