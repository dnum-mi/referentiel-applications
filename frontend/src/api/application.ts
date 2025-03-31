import type { Application } from "@/models/Application";
import requests from "./xhr-client";
import axios from "axios";
import { regexLink, regexPriority, regexTag } from "@/utils/regex";

const Applications = {
  async getAllApplicationBySearch(searchParams?: string, page: number = 0, rowsPerPage: number = 12): Promise<Application[]> {
    const raw = searchParams || "";
    let label = raw;
    const tag: string[] = [];
    let link = "";
    let priorityRestart = "";

    let match: RegExpExecArray | null;

    if ((match = regexLink.exec(raw)) !== null) {
      link = match[0];
    } else {
      while ((match = regexTag.exec(raw)) !== null) {
        tag.push(match[1]);
        label = label.replace(match[0], "").trim();
      }

      if ((match = regexPriority.exec(raw)) !== null) {
        priorityRestart = match[1];
        label = label.replace(match[0], "").trim();
      }
    }

    const params: Record<string, any> = {
      page,
      limit: rowsPerPage,
    };

    if (label) params.label = label;
    if (link) params.link = link;
    if (tag.length) params.tag = tag;
    if (priorityRestart) params.priorityRestart = priorityRestart;

    return await requests.get<Application[]>("/applications/search", {
      params,
    });
  },

  async getApplicationById(id: string): Promise<Application> {
    const response = await axios.get(`/applications/${id}`);
    return response.data;
  },

  async patchApplication(app: Application): Promise<Application> {
    const payload = {
      label: app.label,
      shortName: app.shortName,
      description: app.description,
      targetPopulations: app.targetPopulations,
      purposes: app.purposes,
      tags: app.tags,
      priorityRestart: app.priorityRestart || null,
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
