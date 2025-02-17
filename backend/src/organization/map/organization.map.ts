import { CreateOrganizationDto } from '../dto/create-organization.dto.js';

export const organizationMap = (
  CreateOrganizationDto: CreateOrganizationDto,
) => {
  return {
    data: {
      label: CreateOrganizationDto.label,
      url: CreateOrganizationDto.url,
      sigle: CreateOrganizationDto.sigle,
      parent: CreateOrganizationDto.parentId
        ? { connect: { id: CreateOrganizationDto.parentId } }
        : undefined,
    },
  };
};
