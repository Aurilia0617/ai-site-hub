export interface Maintainer {
  id: string;
  name: string;
  contact_url: string;
}

export type SiteType = 'new-api' | 'other';

export interface Site {
  id: string;
  name: string;
  url: string;
  site_type: SiteType;
  api_key?: string;
  is_checkin: boolean;
  is_benefit: boolean;
  checkin_url: string;
  benefit_url: string;
  tags: string[];
  notes: string;
  maintainers: Maintainer[];
  created_at: string;
  updated_at: string;
}

export interface SitesResponse {
  items: Site[];
  total: number;
}

export interface ImportResult {
  mode: string;
  imported_sites: number;
  created_sites: number;
  updated_sites: number;
  replaced: boolean;
}
