/**
 * Export des configurations de domaines
 */

export { SocialMediaDomain } from './SocialMediaDomain';
export { DevelopmentDomain } from './DevelopmentDomain';

import { SocialMediaDomain } from './SocialMediaDomain';
import { DevelopmentDomain } from './DevelopmentDomain';
import { DomainRegistry } from '../DomainRegistry';

/**
 * Enregistre tous les domaines par défaut
 */
export function registerDefaultDomains(): void {
  const registry = DomainRegistry.getInstance();
  registry.register(SocialMediaDomain);
  registry.register(DevelopmentDomain);
  console.log('[Domains] Default domains registered');
}
