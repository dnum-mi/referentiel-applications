import { ref, type Ref } from "vue";

export default function useModal<T extends object = Record<string, unknown>>() {
  const isModalOpen = ref(false);
  const isCreateModalOpen = ref(false);
  const selectedItem = ref(null) as Ref<T | null>;

  const toggleModal = (type: "view" | "create" | "close", item: T | null = null) => {
    selectedItem.value = item ? { ...item } : null;
    isModalOpen.value = type === "view";
    isCreateModalOpen.value = type === "create";
  };

  const openModal = (item?: T) => toggleModal("view", item ?? null);
  const openCreateModal = () => toggleModal("create");
  const closeModal = () => toggleModal("close");

  return {
    isModalOpen,
    isCreateModalOpen,
    selectedItem,
    openModal,
    openCreateModal,
    closeModal,
  };
}
