// use-toaster.ts
import { ref } from "vue";

const alphanumBase = "abcdefghijklmnopqrstuvwyz0123456789";

const alphanum = alphanumBase.repeat(10);

function getRandomAlphaNum() {
  const randomIndex = Math.floor(Math.random() * alphanum.length);
  return alphanum[randomIndex];
}

function getRandomHtmlId(prefix = "", suffix = "") {
  return (prefix ? `${prefix}-` : "") + getRandomString(5) + (suffix ? `-${suffix}` : "");
}

function getRandomString(length: number) {
  return Array.from({ length }).map(getRandomAlphaNum).join("");
}

export interface Message {
  id: string;
  title?: string;
  description: string;
  type?: "info" | "success" | "warning" | "error";
  closeable?: boolean;
  titleTag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  timeout: number;
  style?: Record<string, string>;
  class?: string | Record<string, string> | Array<string | Record<string, string>>;
}

const timeouts: Record<string, NodeJS.Timeout> = {};

// function taking a Message or a string and return a well formatted Message
export function formatMessage(message: Message | string): Message {
  const defaultTimeout = 15000;
  if (typeof message === "string") {
    return {
      description: message,
      type: "info",
      timeout: defaultTimeout,
      id: getRandomHtmlId("toaster"),
    };
  }
  return {
    ...message,
    id: message.id || getRandomHtmlId("toaster"),
    titleTag: message.titleTag || "h3",
    closeable: message.closeable ?? true,
    type: message.type || "info",
    timeout: message.timeout || defaultTimeout,
  };
}

export const useToasterStore = defineStore("toaster", () => {
  const messages = ref<Message[]>([]);

  const removeMessage = (id: string) => {
    messages.value = messages.value.filter((message) => message.id !== id);
    clearTimeout(timeouts[id]);
    delete timeouts[id];
  };

  const addMessage = (message: Message) => {
    if (message.id && timeouts[message.id]) {
      removeMessage(message.id);
    }

    messages.value.push({ ...message, description: `${message.description}` });
    timeouts[message.id] = setTimeout(() => removeMessage(message.id), message.timeout);
  };

  const addSuccessMessage = (message: Message | string) => {
    addMessage(formatMessage(message));
  };
  const addErrorMessage = (message: Message | string) => {
    addMessage({
      ...formatMessage(message),
      type: "error",
    });
  };

  return {
    messages,
    addMessage,
    removeMessage,
    addSuccessMessage,
    addErrorMessage,
  };
});
