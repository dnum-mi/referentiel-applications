import type { Ref } from "vue";

const pendingCalls = new WeakMap<Ref<boolean>, number>();

/** Le chargement reste actif tant qu'un appel utilisant la même ref est en cours. */
export async function withLoading<T>(isLoading: Ref<boolean>, fn: () => Promise<T>): Promise<T> {
  pendingCalls.set(isLoading, (pendingCalls.get(isLoading) ?? 0) + 1);
  isLoading.value = true;
  try {
    return await fn();
  } finally {
    const remaining = (pendingCalls.get(isLoading) ?? 1) - 1;
    if (remaining > 0) pendingCalls.set(isLoading, remaining);
    else pendingCalls.delete(isLoading);
    isLoading.value = remaining > 0;
  }
}

interface ApiResult<T> {
  data?: T;
  error?: unknown;
  response: Pick<Response, "ok" | "statusText">;
}

interface CallApiOptions {
  isLoading?: Ref<boolean>;
  errorMessage: string;
  toaster?: { addErrorMessage: (message: string) => void };
}

/** Vérifie les erreurs HTTP du SDK fetch ; les erreurs réseau suivent le même chemin. */
export function callApi<T>(fn: () => Promise<ApiResult<T>>, options: CallApiOptions): Promise<T | undefined> {
  const run = async () => {
    try {
      const result = await fn();
      if (!result.response.ok) {
        throw new Error(`${options.errorMessage} (${result.response.statusText})`, { cause: result.error });
      }
      return result.data;
    } catch (error) {
      options.toaster?.addErrorMessage(options.errorMessage);
      console.error(options.errorMessage, error);
      throw error;
    }
  };

  return options.isLoading ? withLoading(options.isLoading, run) : run();
}
