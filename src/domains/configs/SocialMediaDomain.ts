/**
 * Configuration du domaine Social Media
 * Définit les rôles et règles de routage pour les équipes réseaux sociaux
 */

import { DomainConfig } from '../DomainConfig';

export const SocialMediaDomain = DomainConfig.builder('social-media')
  .withName('Social Media Team')
  .withDescription('Équipe de création et publication de contenu sur les réseaux sociaux')

  // Rôles
  .addRole({
    id: 'social_media_manager',
    name: 'Social Media Manager',
    skills: ['youtube', 'tiktok', 'instagram', 'scheduling', 'analytics', 'strategy', 'publication'],
    canLead: true
  })
  .addRole({
    id: 'content_creator',
    name: 'Content Creator',
    skills: ['content', 'ideas', 'scripts', 'storytelling', 'trends', 'créer', 'écrire'],
    canLead: false
  })
  .addRole({
    id: 'video_editor',
    name: 'Video Editor',
    skills: ['video', 'editing', 'effects', 'thumbnails', 'shorts', 'reels', 'montage'],
    canLead: false
  })
  .addRole({
    id: 'copywriter',
    name: 'Copywriter',
    skills: ['captions', 'hashtags', 'descriptions', 'hooks', 'cta', 'texte', 'rédiger', 'titre'],
    canLead: false
  })
  .addRole({
    id: 'community_manager',
    name: 'Community Manager',
    skills: ['engagement', 'comments', 'dms', 'moderation', 'growth', 'communauté'],
    canLead: false
  })

  // Règles de routage
  .addRoutingRule({
    keywords: ['script', 'écrire', 'créer', 'idée', 'content', 'write', 'create', 'idea'],
    targetRoles: ['content_creator'],
    priority: 10
  })
  .addRoutingRule({
    keywords: ['video', 'montage', 'edit', 'reel', 'short', 'thumbnail', 'monter'],
    targetRoles: ['video_editor'],
    priority: 10
  })
  .addRoutingRule({
    keywords: ['caption', 'hashtag', 'description', 'titre', 'texte', 'rédiger', 'hook'],
    targetRoles: ['copywriter'],
    priority: 10
  })
  .addRoutingRule({
    keywords: ['publier', 'publish', 'schedule', 'post', 'analytics', 'programmer'],
    targetRoles: ['social_media_manager'],
    priority: 10
  })
  .addRoutingRule({
    keywords: ['engage', 'comment', 'community', 'moderate', 'communauté', 'répondre'],
    targetRoles: ['community_manager'],
    priority: 10
  })

  // Rôle par défaut
  .withDefaultRole('content_creator')

  // Pipeline de production
  .withPipeline([
    'content_creator',     // 1. Création du script/contenu
    'video_editor',        // 2. Montage vidéo
    'copywriter',          // 3. Rédaction des textes
    'social_media_manager' // 4. Publication
  ])

  .build();
