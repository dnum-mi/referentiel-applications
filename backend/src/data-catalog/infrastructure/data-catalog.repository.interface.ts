import {
  CreateDataDescriptionDto,
  DataDescriptionDto,
} from "../dto/create-data-description.dto";
import { DataApplicationDto } from "../dto/create-data-application.dto";
import { PaginatedResponseDto } from "../../common/dto";

export interface IDataCatalogRepository {
  createDescription(dto: CreateDataDescriptionDto): Promise<DataDescriptionDto>;

  findAllDescriptions(
    page: number,
    pageSize: number,
  ): Promise<DataDescriptionDto[]>;

  findDescriptionById(id: string): Promise<DataDescriptionDto | null>;

  updateDescription(
    id: string,
    dto: Partial<CreateDataDescriptionDto>,
  ): Promise<DataDescriptionDto>;

  deleteDescription(id: string): Promise<void>;

  findOneApplicationData(
    applicationId: string,
    dataApplicationId: string,
  ): Promise<DataApplicationDto | null>;

  findByApplicationId(
    applicationId: string,
    page: number,
    pageSize: number,
    order?: "asc" | "desc",
  ): Promise<PaginatedResponseDto<DataApplicationDto>>;
}

export const IDataCatalogRepositoryToken = Symbol("IDataCatalogRepository");
