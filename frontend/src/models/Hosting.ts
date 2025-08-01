export interface Hosting {
  id: string
  label?: string
  hostingOptionId?: string
  hostingOption?: HostingOption
  applicationId: string
}

export interface HostingOption {
  id: string
  site: string
  platform: string
  provider: string
  building?: string
  room?: string
}
