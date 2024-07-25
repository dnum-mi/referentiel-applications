import { ActActor } from '@prisma/client';

export class User {
  username: string;
  role: string;
  groups?: string[];
  actor?: ActActor;

  public get isDSO(): boolean {
    return this.username === 'DSO' && !this.actor;
  }

  public get isAdmin(): boolean {
    return (this.isDSO || this.groups?.includes('Administration')) ?? false;
  }

  public get isDirector(): boolean {
    return this.groups?.includes('Direction') ?? false;
  }

  public get isPublic(): boolean {
    return !this.groups || (!this.isAdmin && !this.isDirector);
  }
}
