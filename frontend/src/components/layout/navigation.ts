import type { LucideIcon } from 'lucide-react';
import {
  Gauge,
  FolderKanban,
  Images,
  ScanSearch,
  FileText,
  UserCheck,
} from 'lucide-react';

export interface NavItem {
  name: string;
  to: string;
  icon: LucideIcon;
  /** Shown in the status strip. Kept short so the rail never wraps. */
  hint: string;
}

/**
 * Single source of truth for navigation, shared by the app shell and the 404
 * page. Order follows the reviewer's actual workflow: orient, then verify,
 * then act on exceptions, then report.
 */
export const navigation: NavItem[] = [
  { name: 'Overview', to: '/dashboard', icon: Gauge, hint: 'pipeline health' },
  { name: 'Projects', to: '/projects', icon: FolderKanban, hint: 'routing targets' },
  { name: 'Media', to: '/media', icon: Images, hint: 'all captures' },
  { name: 'Search', to: '/search', icon: ScanSearch, hint: 'hybrid retrieval' },
  { name: 'Review', to: '/review', icon: UserCheck, hint: 'needs a decision' },
  { name: 'Reports', to: '/reports', icon: FileText, hint: 'audit output' },
];
