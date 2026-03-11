import { useReportStore } from "@/stores/reportStore";
import { useToggle } from "@vueuse/core";

const useEditedNotes = (notes: MaybeRefOrGetter<string>) => {
  const _notes = toRef(notes);
  const _editedNotes = ref(toValue(notes));
  const initialNotes = computed(() => _notes.value);
  const handleReset = () => {
    _editedNotes.value = initialNotes.value;
  };
  watch(_notes, (newValue) => {
    _editedNotes.value = newValue;
  });

  return {
    editedNotes: _editedNotes,
    handleReset,
  };
};

export const useNotesDialog = (initialNotes: MaybeRefOrGetter<string>, onRefresh: () => void) => {
  const reportStore = useReportStore();

  const [isOpen, toggleDialog] = useToggle(false);
  const openDialog = () => toggleDialog(true);
  const hideDialog = () => toggleDialog(false);

  const { editedNotes, handleReset } = useEditedNotes(initialNotes);

  const submit = async (reportId: string) => {
    try {
      await reportStore.updateNotes(reportId, editedNotes.value);
    } catch (err) {
      console.error("Erreur lors de la mise à jour de la notes :", err);
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
    editedNotes,
    handleClose,
  };
};
