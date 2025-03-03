import type { Actor } from "@/models/Actor";
import axios from "axios";

const Actors = {
  async create(actor: Actor, applicationId: string): Promise<Actor> {
    const payload = {
      role: actor.role,
      email: actor.email,
      firstname: actor.firstname,
      lastname: actor.lastname,
      type: actor.type,
      organizationId: actor.organizationId,
      applicationId: applicationId,
    };

    const response = await axios.post<Actor>("/actor", payload);

    console.log("response API");
    console.log(response);
    return response.data;
  },

  async update(actor: Actor): Promise<Actor> {
    const payload = {
      role: actor.role,
      email: actor.email,
      firstname: actor.firstname,
      lastname: actor.lastname,
      type: actor.type,
      organizationId: actor.organizationId,
      applicationId: actor.applicationId,
    };

    const response = await axios.patch<Actor>(`/actor/${actor.id}`, payload);

    console.log("response API");
    console.log(response);
    return response.data;
  },

  async delete(actorId: string): Promise<Actor> {
    const response = await axios.delete<Actor>(`/actor/${actorId}`);

    console.log("response API");
    console.log(response);
    return response.data;
  },
};

export default Actors;
