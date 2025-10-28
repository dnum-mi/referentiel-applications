import type { TagDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";

export const useTagStore = defineStore("tagStore", () => {
  const tags = ref<(TagDto)[]>([]);
  const error = ref<string | null>(null);

  async function find(name?: string): Promise<TagDto[]> {
    const response = await api.tagsControllerFindAll({
      query: { name },
    });

    if (!response.response.ok) {
      throw new Error("Failed to fetch tags");
    }

    const data = response.data ?? [];

    tags.value = data;
    error.value = null;

    return data;
  }

  return {
    tags,
    error,
    find,
  };
});
