import type { User } from "../models/user";
import requests from "./xhr-client";
import useToaster from "@/composables/use-toaster.js";

const toaster = useToaster();

const Users = {
  createOrUpdateUser: async (keycloakId: string, email: string) => {
    console.log(keycloakId);
    const response = await requests.post<User>("/users", { keycloakId, email });
    console.log({ "response:": response });
    return response;
  },
  getUser: async () => {
    try {
      const response = await requests.get<User>("/users/me");
      return response;
    } catch (_error) {
      toaster.addErrorMessage("Échec du chargement des informations de l'utilisateur");
    }
  },
  getAllUsers: async (filters?: { search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);

    const queryString = params.toString();
    const url = queryString ? `/users?${queryString}` : "/users";

    return await requests.get<User[]>(url);
  },
  updateUserPermissions: async (keycloakId: string, permissions: string) => {
    return await requests.patch<User>(`/users/${keycloakId}`, { permissions });
  },
};

export default Users;
