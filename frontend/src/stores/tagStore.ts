import type { CreateTagDto, TagDto, TagFiltersDto, TagsPaginatedResponseDto, UpdateTagDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";

export const useTagStore = defineStore("tagStore", () => {
  const tags = ref<(TagDto)[]>([]);
  const error = ref<string | null>(null);

  async function find(
    query: TagFiltersDto,
  ): Promise<TagsPaginatedResponseDto> {
    const response = await api.tagsControllerFindAll({ query });

    if (!response.response.ok) {
      error.value = "Failed to fetch tags";
      throw new Error("Failed to fetch tags");
    }

    const data = response.data!;

    tags.value = data.results;

    error.value = null;
    return data;
  }

  async function createTag(name: string) {
    const response = await api.tagsControllerCreate({
      body: {
        name,
      } as CreateTagDto,
    });

    if (!response.response.ok) {
      throw new Error("Failed to create tag");
    }

    return response;
  }

  async function updateTag(id: string, name: string) {
    const response = await api.tagsControllerUpdate({
      path: { id },
      body: {
        name,
      } as UpdateTagDto,
    });

    if (!response.response.ok) {
      throw new Error("Failed to update tag");
    }

    return response;
  }

  async function deleteTag(id: string) {
    const response = await api.tagsControllerDelete({ path: { id } });

    if (!response.response.ok) {
      throw new Error("Failed to delete tag");
    }

    return response;
  }

  return {
    tags,
    error,
    find,
    createTag,
    updateTag,
    deleteTag,
  };
});
