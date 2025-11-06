export function useGraphStyles() {
  const getGraphStyles = () => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const root = isDark
      ? { fill: "#1E40AF", stroke: "#60A5FA", text: "#FFFFFF", shape: "roundrect" }
      : { fill: "#2563EB", stroke: "#1D4ED8", text: "#FFFFFF", shape: "roundrect" };
    const node = isDark
      ? { fill: "#374151", stroke: "#9CA3AF", text: "#F3F4F6", shape: "ellipse" }
      : { fill: "#E5E7EB", stroke: "#9CA3AF", text: "#111827", shape: "ellipse" };
    const edge = isDark
      ? {
          is_part_of: { color: "#60A5FA", style: "solid" },
          in_replacement_of: { color: "#F59E0B", style: "dashed" },
          is_service_user_of: { color: "#10B981", style: "solid" },
          is_data_user_of: { color: "#F43F5E", style: "dotted" },
        }
      : {
          is_part_of: { color: "#2563EB", style: "solid" },
          in_replacement_of: { color: "#D97706", style: "dashed" },
          is_service_user_of: { color: "#059669", style: "solid" },
          is_data_user_of: { color: "#B91C1C", style: "dotted" },
        };
    return { root, node, edge };
  };

  return { getGraphStyles };
}
