export class Hosting {
  id: string;
  provider?: string;
  label?: string;
  region?: string;
  site?: string;
  nature?: string;
  platform?: string;
  applicationId: string;

  // New field for HostingOption relationship
  hostingOptionId?: string;
  hostingOption?: {
    id: string;
    room?: string;
    building?: string;
    site: string;
    platform: string;
    provider: string;
    description?: string;
  };
}
