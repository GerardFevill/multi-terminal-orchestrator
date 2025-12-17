/**
 * Configuration du domaine Development
 * Définit les rôles et règles de routage pour les équipes de développement
 */

import { DomainConfig } from '../DomainConfig';

export const DevelopmentDomain = DomainConfig.builder('development')
  .withName('Development Team')
  .withDescription('Équipe de développement logiciel')

  // Rôles
  .addRole({
    id: 'lead',
    name: 'Tech Lead',
    skills: ['planning', 'coordination', 'review', 'architecture', 'decision'],
    canLead: true
  })
  .addRole({
    id: 'developer',
    name: 'Developer',
    skills: ['code', 'typescript', 'nodejs', 'programming', 'implement', 'développer', 'coder'],
    canLead: false
  })
  .addRole({
    id: 'reviewer',
    name: 'Code Reviewer',
    skills: ['review', 'quality', 'best-practices', 'refactor', 'code-review'],
    canLead: false
  })
  .addRole({
    id: 'tester',
    name: 'QA Tester',
    skills: ['testing', 'qa', 'automation', 'test', 'tester', 'debug'],
    canLead: false
  })
  .addRole({
    id: 'architect',
    name: 'Software Architect',
    skills: ['design', 'architecture', 'system', 'pattern', 'structure'],
    canLead: true
  })
  .addRole({
    id: 'analyst',
    name: 'Business Analyst',
    skills: ['analysis', 'research', 'documentation', 'specs', 'requirements'],
    canLead: false
  })

  // Règles de routage
  .addRoutingRule({
    keywords: ['code', 'implement', 'develop', 'build', 'create', 'coder', 'développer'],
    targetRoles: ['developer'],
    priority: 10
  })
  .addRoutingRule({
    keywords: ['test', 'qa', 'quality', 'bug', 'debug', 'tester'],
    targetRoles: ['tester'],
    priority: 10
  })
  .addRoutingRule({
    keywords: ['review', 'pr', 'pull request', 'code review', 'refactor'],
    targetRoles: ['reviewer', 'lead'],
    priority: 10
  })
  .addRoutingRule({
    keywords: ['design', 'architecture', 'system', 'structure', 'pattern'],
    targetRoles: ['architect', 'lead'],
    priority: 10
  })
  .addRoutingRule({
    keywords: ['analyze', 'research', 'document', 'spec', 'requirement'],
    targetRoles: ['analyst'],
    priority: 10
  })
  .addRoutingRule({
    keywords: ['plan', 'coordinate', 'decide', 'priority', 'lead'],
    targetRoles: ['lead'],
    priority: 5
  })

  // Rôle par défaut
  .withDefaultRole('developer')

  // Pipeline de développement
  .withPipeline([
    'analyst',    // 1. Analyse des besoins
    'architect',  // 2. Design
    'developer',  // 3. Développement
    'reviewer',   // 4. Code review
    'tester',     // 5. Tests
    'lead'        // 6. Validation finale
  ])

  .build();
