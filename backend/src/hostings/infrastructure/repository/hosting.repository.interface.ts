import type {
  CreateHostingDto,
  UpdateHostingDto,
} from "src/hostings/dto/hosting.dto";
import type { Hosting } from "src/hostings/entities/hosting.entity";

export interface IHostingRepository {
  create: (data: CreateHostingDto) => Promise<Hosting>;
  count: () => Promise<number>;
  findAll: () => Promise<Hosting[]>;
  findById: (id: string) => Promise<Hosting | null>;
  update: (id: string, data: UpdateHostingDto) => Promise<Hosting>;
  delete: (id: string) => Promise<void>;
  findBySite: (site: string) => Promise<Hosting[]>;
  findDistinctSites: () => Promise<string[]>;
  findByApplicationId: (applicationId: string) => Promise<Hosting[]>;
}
