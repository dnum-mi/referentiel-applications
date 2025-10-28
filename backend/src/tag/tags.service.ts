import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { CreateTagDto, TagFiltersDto, UpdateTagDto } from "./dto/tag.dto";
import { ITagRepository } from "./infrastructure/repository/tag.repository.interface";

@Injectable()
export class TagsService {
  constructor(
    @Inject("ITagRepository")
    private readonly repository: ITagRepository,
  ) {}

  create(dto: CreateTagDto) {
    return this.repository.create(dto);
  }

  findOne(id: string) {
    return this.repository.findById(id);
  }

  findAll(filters: TagFiltersDto) {
    return this.repository.findAll(filters);
  }

  async findByNames(tagNames: string[]) {
    const existingTags = await this.repository.findByNames(tagNames);

    if (existingTags.length !== tagNames.length) {
      const existingNames = existingTags.map(tag => tag.name);
      const missingNames = tagNames.filter(name => !existingNames.includes(name));

      throw new BadRequestException({
        message: "Certains tags n’existent pas.",
        tags_inexistant: missingNames,
      });
    }

    return existingTags.map(tag => ({ name: tag.name }));
  }

  update(id: string, dto: UpdateTagDto) {
    return this.repository.update(id, dto);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
