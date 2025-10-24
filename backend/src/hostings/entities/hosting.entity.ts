export class Hosting {
  id: string;
  label?: string;
  applicationId: string;

  hostingOptionId?: string;
  hostingOption?: {
    id: string
    room?: string
    building?: string
    site: string
    platform: string
    provider: string
  };
}
