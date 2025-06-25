export const apiConfig = {
  actor: {
    create: {
      method: "POST",
      url: "/applications/:applicationId/actors",
      payload: ["email", "firstname", "lastname", "actorTypeId", "organizationId", "applicationId"],
    },
    update: {
      method: "PATCH",
      url: "/applications/:applicationId/actors/:id",
      payload: ["email", "firstname", "lastname", "actorTypeId", "organizationId", "applicationId"],
    },
    delete: {
      method: "DELETE",
      url: "/applications/:applicationId/actors/:id",
    },
  },

  application: {
    get: {
      method: "GET",
      url: "/applications/:id",
    },
    list: {
      method: "GET",
      url: "/applications",
    },
    patch: {
      method: "PATCH",
      url: "/applications/:id",
      payload: ["label", "shortName", "description", "targetPopulations", "purposes", "tags", "priorityRestart", "actors"],
    },
  },
  applicationSearch: {
    method: "GET",
    url: "/applications/search",
    query: [
      "label",
      "shortName",
      "tag",
      "priorityRestart",
      "hostingSearch",
      "organizationLabel",
      "actorType",
      "link",
      "iqMin",
      "iqMax",
      "page",
      "limit",
      "sortBy",
      "order",
    ],
  },
  hosting: {
    create: {
      method: "POST",
      url: "/applications/:applicationId/hostings",
      payload: ["provider", "label", "region", "site", "nature", "platform", "applicationId", "hostingOptionId"],
    },
    update: {
      method: "PATCH",
      url: "/applications/:applicationId/hostings/:hostingId",
      payload: ["provider", "label", "region", "site", "nature", "platform", "applicationId", "hostingOptionId"],
    },
    delete: {
      method: "DELETE",
      url: "/applications/:applicationId/hostings/:hostingId",
    },
    getByApplication: {
      method: "GET",
      url: "/applications/:applicationId/hostings",
    },
  },

  organization: {
    get: {
      method: "GET",
      url: "/organizations/:id",
    },
    list: {
      method: "GET",
      url: "/organizations",
    },
  },
  actorType: {
    get: {
      method: "GET",
      url: "/actorTypes/:id",
    },
    list: {
      method: "GET",
      url: "/actorTypes",
    },
  },
  event: {
    create: {
      method: "POST",
      url: "/applications/:applicationId/events",
      payload: ["start", "end", "description", "type"],
    },
    delete: {
      method: "DELETE",
      url: "/applications/:applicationId/events/:eventId",
    },
    getByApplication: {
      method: "GET",
      url: "/applications/:applicationId/events",
    },
  },

  relation: {
    create: {
      method: "POST",
      url: "/relations",
      payload: ["applicationSource", "applicationTarget", "type"],
    },
    getAll: {
      method: "GET",
      url: "/relations",
    },
    update: {
      method: "PATCH",
      url: "/relations/:id",
      payload: ["applicationSource", "applicationTarget", "type"],
    },
    delete: {
      method: "DELETE",
      url: "/relations/:id",
    },
  },

  reportIssue: {
    create: {
      method: "POST",
      url: "/anomaly-notifications",
      payload: ["applicationId", "description", "status"],
    },
    getAll: {
      method: "GET",
      url: "/anomaly-notifications",
    },
    getByAppId: {
      method: "GET",
      url: "/anomaly-notifications?applicationId=:applicationId",
    },
    getByNotifierId: {
      method: "GET",
      url: "/anomaly-notifications/user-notifications",
    },
    delete: {
      method: "DELETE",
      url: "/anomaly-notifications/:id",
    },
  },
  link: {
    create: {
      method: "POST",
      url: "/applications/:applicationId/links",
      payload: ["link", "description", "type"],
    },
    update: {
      method: "PATCH",
      url: "/applications/:applicationId/links/:linkId",
      payload: ["link", "description", "type", "applicationId"],
    },
    delete: {
      method: "DELETE",
      url: "/applications/:applicationId/links/:linkId",
    },
    getByApplication: {
      method: "GET",
      url: "/applications/:applicationId/links",
    },
  },

  site: {
    listSites: {
      method: "GET",
      url: "/sites",
    },
    getApplications: {
      method: "GET",
      url: "/sites/:site/applications",
    },
  },

  user: {
    createOrUpdate: {
      method: "POST",
      url: "/users",
      payload: ["keycloakId", "email"],
    },
  },
} as const;
