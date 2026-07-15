import {
  CreateDataDescriptionDto,
  DataDescriptionDto,
} from "../dto/create-data-description.dto";
import {
  CreateDataApplicationDto,
  CreateDataExposureDto,
  DataApplicationDto,
  DataExposureDto,
} from "../dto/create-data-application.dto";
import { PaginatedResponseDto } from "../../common/dto";

export interface IDataCatalogRepository {
  createDescription(dto: CreateDataDescriptionDto): Promise<DataDescriptionDto>;

  findAllDescriptions(
    page: number,
    pageSize: number,
    name?: string,
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
    sortBy?: string,
  ): Promise<PaginatedResponseDto<DataApplicationDto>>;

  createApplicationData(
    applicationId: string,
    dto: CreateDataApplicationDto,
  ): Promise<DataApplicationDto>;

  updateApplicationData(
    applicationId: string,
    dataApplicationId: string,
    dto: Partial<CreateDataApplicationDto>,
  ): Promise<DataApplicationDto | null>;

  deleteApplicationData(
    applicationId: string,
    dataApplicationId: string,
  ): Promise<boolean>;

  createExposure(
    applicationId: string,
    dataApplicationId: string,
    dto: CreateDataExposureDto,
  ): Promise<DataExposureDto | null>;

  updateExposure(
    applicationId: string,
    dataApplicationId: string,
    exposureId: string,
    dto: Partial<CreateDataExposureDto>,
  ): Promise<DataExposureDto | null>;

  deleteExposure(
    applicationId: string,
    dataApplicationId: string,
    exposureId: string,
  ): Promise<boolean>;
}

export const IDataCatalogRepositoryToken = Symbol("IDataCatalogRepository");
