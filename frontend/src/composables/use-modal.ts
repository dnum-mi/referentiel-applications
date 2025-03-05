import { ref } from "vue";

export default function useModal() {
  const isModalOpen = ref(false);
  const isCreateModalOpen = ref(false);
  const selectedItem = ref(null);

  const toggleModal = (type: "view" | "create" | "close", item = null) => {
    selectedItem.value = item ? { ...item } : null;
    isModalOpen.value = type === "view";
    isCreateModalOpen.value = type === "create";
  };

  const openModal = (item) => toggleModal("view", item);
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
