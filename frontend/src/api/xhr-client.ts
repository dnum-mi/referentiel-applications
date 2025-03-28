import { authentication } from "@/services/authentication";
import axios, { type AxiosResponse } from "axios";
import useToaster from "@/composables/use-toaster";

const toaster = useToaster();

axios.defaults.baseURL = `${import.meta.env.VITE_RDA_API_URL ?? "VITE_RDA_API_URL"}/api/v2`;
axios.defaults.withCredentials = true;
axios.defaults.headers.common.Accept = "application/json";
axios.defaults.headers.common["Content-Type"] = "application/json";
axios.defaults.timeout = 10000;

axios.interceptors.request.use(
  (config) => {
    const token = authentication.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      toaster.addErrorMessage("Permission refusée : Vous n'avez pas la permission d'effectuer cette action.");
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);

const responseBody = <T>(response: AxiosResponse<T>) => response.data;

export function get<T>(endpoint: string, params?: any): Promise<T> {
  return axios.get<T>(endpoint, params).then(responseBody);
}

export function post<T>(endpoint: string, body: object): Promise<T> {
  return axios.post<T>(endpoint, body).then(responseBody);
}

export function put<T>(endpoint: string, body: object): Promise<T> {
  return axios.put<T>(endpoint, body).then(responseBody);
}

export function patch<T>(endpoint: string, body: object): Promise<T> {
  return axios.patch<T>(endpoint, body).then(responseBody);
}

export function del<T>(endpoint: string, params?: any): Promise<T> {
  return axios.delete<T>(endpoint, { params }).then(responseBody);
}

const requests = {
  get,
  post,
  put,
  patch,
  del,
};

export default requests;
