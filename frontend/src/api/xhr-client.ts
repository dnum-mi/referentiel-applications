import axios from "axios";
import type { AxiosResponse } from "axios";

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
