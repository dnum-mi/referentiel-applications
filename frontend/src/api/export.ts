import axios from "axios";

const ExportApi = {
  async exportToCsv(filters: Record<string, any> = {}): Promise<Blob> {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => {
        if (value === "" || value === null || value === undefined) return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      }),
    );

    const response = await axios.get("/applications/export", {
      responseType: "blob",
      params: cleanFilters,
    });

    return new Blob([response.data], { type: "text/csv;charset=utf-8;" });
  },

  downloadBlob(blob: Blob, filename: string = "applications_export.csv"): void {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  },

  async downloadCsv(filters: Record<string, any> = {}): Promise<void> {
    const blob = await this.exportToCsv(filters);
    this.downloadBlob(blob);
  },
};

export default ExportApi;
