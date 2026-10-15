import { useReportStore } from "@/stores/reportStore";
import { useToasterStore } from "@/stores/toasterStore";
import { useToggle } from "@vueuse/core";
import { onScopeDispose } from "vue";
import { useSubmissionFocus } from "@/composables/use-submission-focus";

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
  const toaster = useToasterStore();

  const [isOpen, toggleDialog] = useToggle(false);
  const isSubmitting = ref(false);
  useSubmissionFocus(isSubmitting);
  const submissionError = ref("");
  let isDisposed = false;
  onScopeDispose(() => (isDisposed = true));
  const openDialog = () => {
    submissionError.value = "";
    toggleDialog(true);
  };
  const hideDialog = () => toggleDialog(false);

  const { editedNotes, handleReset } = useEditedNotes(initialNotes);

  const submit = async (reportId: string) => {
    if (isSubmitting.value) return;
    submissionError.value = "";
    isSubmitting.value = true;
    try {
      await reportStore.updateNotes(reportId, editedNotes.value);
    } catch (err) {
      console.error("Erreur lors de la mise à jour de la notes :", err);
      // La modale reste ouverte et la note éditée n'est pas perdue : sans ça, l'utilisateur
      // croyait sa note enregistrée alors que la sauvegarde avait échoué.
      const message = "Erreur lors de l'enregistrement de la note.";
      if (isOpen.value && !isDisposed) submissionError.value = message;
      else toaster.addErrorMessage(message);
      return;
    } finally {
      isSubmitting.value = false;
    }
    hideDialog();
    onRefresh();
  };

  const handleClose = () => {
    submissionError.value = "";
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
    isSubmitting,
    submissionError,
  };
};
