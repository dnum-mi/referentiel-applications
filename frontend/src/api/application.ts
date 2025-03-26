import type { Application } from "@/models/Application";
import requests from "./xhr-client";
import axios from "axios";
import { regexLink, regexTag } from "@/utils/regex";

const Applications = {
  async getAllApplicationBySearch(searchParams?: string): Promise<Application[]> {
    let label = searchParams;
    const tag = [];
    let link = "";
    let match = null;

    if ((match = regexLink.exec(searchParams)) != null) {
      link = match[0];
    } else {
      while ((match = regexTag.exec(searchParams)) != null) {
        tag.push(match[1]);
        label = label.replace(match[0], "").trim();
      }
    }

    return await requests.get<Application[]>("/applications/search", {
      params: {
        link: link ? link : undefined,
        label: label ? label : undefined,
        tag: tag.length > 0 ? tag : [],
      },
    });
  },

  async getApplicationById(id: string): Promise<Application> {
    const response = await axios.get(`/applications/${id}`);
    return response.data;
  },

  async patchApplication(app: Application): Promise<Application> {
    const payload = {
      description: app.description,
      purposes: app.purposes,
      tags: app.tags,
      compliances: app.compliances
        ? app.compliances.map((compliance) => ({
            id: compliance.id,
            type: compliance.type,
            name: compliance.name,
            status: compliance.status,
            validityStart: compliance.validityStart,
            validityEnd: compliance.validityEnd,
            scoreValue: compliance.scoreValue,
            scoreUnit: compliance.scoreUnit,
            notes: compliance.notes,
          }))
        : [],
    };

    const response = await axios.patch<Application>(`/applications/${app.id}`, payload);
    console.log(response);
    return response.data;
  },
};

export default Applications;
