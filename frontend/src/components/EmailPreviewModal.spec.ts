import { mount } from "@vue/test-utils";
import type { EmailLogDto } from "@/client/types.gen";
import EmailPreviewModal from "./EmailPreviewModal.vue";

it("affiche une copie structurée et garde le HTML archivé et le sandbox inchangés", () => {
  const log: EmailLogDto = {
    id: "email-1",
    to: "agent@example.fr",
    subject: "Vos droits",
    sentAt: new Date("2026-10-12T10:00:00Z"),
    wasSent: true,
    html: '<html lang="fr"><body><table role="presentation" width="100%" border="0"><tr><td>Vos droits ont changé.</td></tr></table></body></html>',
    text: "Vos droits ont changé.",
  };
  const original = log.html;
  const wrapper = mount(EmailPreviewModal, {
    props: { log, opened: false },
    global: { stubs: { Teleport: true, DsfrModal: { template: "<div><slot /></div>" } } },
  });
  const frame = wrapper.get("iframe");
  expect(frame.attributes("sandbox")).toBe("");
  expect(frame.attributes("title")).toBe("Contenu de l'e-mail");
  expect(frame.attributes("srcdoc")).toContain("<main>");
  expect(frame.attributes("srcdoc")).not.toContain('border="0"');
  expect(log.html).toBe(original);
  wrapper.unmount();
});
