import { useReportIssueStore } from "@/stores/reportIssueStore";
import { useToggle } from "../use-toggle";

const useEditedDescription = (description: MaybeRefOrGetter<string>) => {
  const _description = toRef(description);
  const _editedDescription = ref(toValue(description));
  const initialDescription = computed(() => _description.value);
  const handleReset = () => {
    _editedDescription.value = initialDescription.value;
  };
  watch(_description, (newValue) => {
    _editedDescription.value = newValue;
  });

  return {
    editedDescription: _editedDescription,
    handleReset,
  };
};

export const useDescriptionDialog = (initialDescription: MaybeRefOrGetter<string>, onRefresh: () => void) => {
  const reportStore = useReportIssueStore();

  const { isToggle: isOpen, off: hideDialog, on: openDialog } = useToggle();

  const { editedDescription, handleReset } = useEditedDescription(initialDescription);

  const submit = async (reportId: string) => {
    try {
      await reportStore.updateDescription(reportId, editedDescription.value);
    } catch (err) {
      console.error("Erreur lors de la mise à jour de la description :", err);
    }
    hideDialog();
    onRefresh();
  };

  const handleClose = () => {
    handleReset();
    hideDialog();
  };

  return {
    isOpen,
    openDialog,
    handleReset,
    submit,
    editedDescription,
    handleClose,
  };
};
