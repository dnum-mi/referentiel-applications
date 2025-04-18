import type { Actor } from "@/models/Actor";
import axios from "axios";

const Actors = {
  async create(actor: Actor): Promise<Actor> {
    const { data } = await axios.post<Actor>(`applications/${actor.applicationId}/actors`, actor);
    return data;
  },

  async findByApplicationId(applicationId: string): Promise<Actor[]> {
    const { data } = await axios.get<Actor[]>(`applications/${applicationId}/actors`);
    return data;
  },

  async update(actor: Actor): Promise<Actor> {
    const { data } = await axios.patch<Actor>(`applications/${actor.applicationId}/actors/${actor.id}`, actor);
    return data;
  },

  async delete(applicationId: string, actorId: string): Promise<Actor> {
    const { data } = await axios.delete<Actor>(`applications/${applicationId}/actors/${actorId}`);
    return data;
  },
};

export default Actors;
