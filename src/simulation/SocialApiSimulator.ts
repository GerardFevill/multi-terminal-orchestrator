/**
 * Simulateur d'APIs de réseaux sociaux
 * Single Responsibility (S) - Simulation des APIs uniquement
 */

import { SocialPlatform, IPublishConfig } from '../interfaces/ITeam';

export interface ISimulatedPost {
  postId: string;
  url: string;
  platform: SocialPlatform;
  timestamp: Date;
  status: 'published' | 'scheduled' | 'failed';
}

export interface ISimulatedMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
}

export interface ISimulatedResponse {
  success: boolean;
  post?: ISimulatedPost;
  error?: string;
  metrics?: ISimulatedMetrics;
}

export class SocialApiSimulator {
  private postCounter = 0;
  private posts: Map<string, ISimulatedPost> = new Map();
  private metrics: Map<string, ISimulatedMetrics> = new Map();
  private failureRate: number;

  constructor(failureRate: number = 0.1) {
    this.failureRate = failureRate; // 10% d'échecs par défaut
  }

  /**
   * Simule la publication sur une plateforme
   */
  async publish(config: IPublishConfig): Promise<ISimulatedResponse> {
    // Simule la latence réseau
    await this.delay(500 + Math.random() * 1000);

    // Simule des échecs occasionnels
    if (Math.random() < this.failureRate) {
      const errors = [
        'API rate limit exceeded',
        'Authentication failed',
        'Network timeout',
        'Invalid media format',
        'Content policy violation'
      ];
      return {
        success: false,
        error: `[SIMULATED] ${errors[Math.floor(Math.random() * errors.length)]} for ${config.platform}`
      };
    }

    this.postCounter++;
    const postId = `sim-${config.platform}-${Date.now()}-${this.postCounter}`;

    const post: ISimulatedPost = {
      postId,
      url: this.generateUrl(config.platform, postId),
      platform: config.platform,
      timestamp: config.scheduledAt || new Date(),
      status: config.scheduledAt && config.scheduledAt > new Date() ? 'scheduled' : 'published'
    };

    this.posts.set(postId, post);

    // Génère des métriques initiales
    this.metrics.set(postId, {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      engagementRate: 0
    });

    console.log(`[SocialApiSimulator] Published to ${config.platform}: ${postId}`);

    return {
      success: true,
      post,
      metrics: this.metrics.get(postId)
    };
  }

  /**
   * Récupère les métriques d'un post
   */
  async getAnalytics(postId: string): Promise<ISimulatedResponse> {
    await this.delay(200);

    const post = this.posts.get(postId);
    if (!post) {
      return {
        success: false,
        error: `Post ${postId} not found`
      };
    }

    // Simule l'évolution des métriques
    const existingMetrics = this.metrics.get(postId)!;
    const hoursSincePublish = (Date.now() - post.timestamp.getTime()) / (1000 * 60 * 60);

    const metrics: ISimulatedMetrics = {
      views: Math.floor(existingMetrics.views + Math.random() * 1000 * hoursSincePublish),
      likes: Math.floor(existingMetrics.likes + Math.random() * 50 * hoursSincePublish),
      comments: Math.floor(existingMetrics.comments + Math.random() * 10 * hoursSincePublish),
      shares: Math.floor(existingMetrics.shares + Math.random() * 5 * hoursSincePublish),
      engagementRate: 0
    };

    // Calcule le taux d'engagement
    const totalEngagements = metrics.likes + metrics.comments + metrics.shares;
    metrics.engagementRate = metrics.views > 0
      ? (totalEngagements / metrics.views) * 100
      : 0;

    this.metrics.set(postId, metrics);

    return {
      success: true,
      post,
      metrics
    };
  }

  /**
   * Récupère tous les posts d'une plateforme
   */
  async getPlatformPosts(platform: SocialPlatform): Promise<ISimulatedPost[]> {
    await this.delay(100);

    return Array.from(this.posts.values())
      .filter(p => p.platform === platform);
  }

  /**
   * Supprime un post
   */
  async deletePost(postId: string): Promise<ISimulatedResponse> {
    await this.delay(300);

    if (!this.posts.has(postId)) {
      return {
        success: false,
        error: `Post ${postId} not found`
      };
    }

    this.posts.delete(postId);
    this.metrics.delete(postId);

    console.log(`[SocialApiSimulator] Deleted post: ${postId}`);

    return { success: true };
  }

  /**
   * Met à jour un post programmé
   */
  async updateScheduledPost(
    postId: string,
    updates: Partial<IPublishConfig>
  ): Promise<ISimulatedResponse> {
    await this.delay(400);

    const post = this.posts.get(postId);
    if (!post) {
      return {
        success: false,
        error: `Post ${postId} not found`
      };
    }

    if (post.status !== 'scheduled') {
      return {
        success: false,
        error: 'Can only update scheduled posts'
      };
    }

    if (updates.scheduledAt) {
      post.timestamp = updates.scheduledAt;
    }

    console.log(`[SocialApiSimulator] Updated post: ${postId}`);

    return {
      success: true,
      post
    };
  }

  /**
   * Génère une URL simulée pour un post
   */
  private generateUrl(platform: SocialPlatform, postId: string): string {
    const baseUrls: Record<SocialPlatform, string> = {
      [SocialPlatform.YOUTUBE]: 'https://youtube.com/watch?v=',
      [SocialPlatform.TIKTOK]: 'https://tiktok.com/@user/video/',
      [SocialPlatform.INSTAGRAM]: 'https://instagram.com/p/',
      [SocialPlatform.TWITTER]: 'https://twitter.com/user/status/',
      [SocialPlatform.LINKEDIN]: 'https://linkedin.com/posts/',
      [SocialPlatform.FACEBOOK]: 'https://facebook.com/posts/'
    };

    return `${baseUrls[platform]}${postId}`;
  }

  /**
   * Simule un délai réseau
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Récupère les statistiques globales
   */
  getGlobalStats(): {
    totalPosts: number;
    postsByPlatform: Record<string, number>;
    totalViews: number;
    averageEngagement: number;
  } {
    const postsByPlatform: Record<string, number> = {};
    let totalViews = 0;
    let totalEngagement = 0;

    for (const post of this.posts.values()) {
      postsByPlatform[post.platform] = (postsByPlatform[post.platform] || 0) + 1;
    }

    for (const metrics of this.metrics.values()) {
      totalViews += metrics.views;
      totalEngagement += metrics.engagementRate;
    }

    const averageEngagement = this.metrics.size > 0
      ? totalEngagement / this.metrics.size
      : 0;

    return {
      totalPosts: this.posts.size,
      postsByPlatform,
      totalViews,
      averageEngagement
    };
  }

  /**
   * Configure le taux d'échec
   */
  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Reset le simulateur
   */
  reset(): void {
    this.posts.clear();
    this.metrics.clear();
    this.postCounter = 0;
  }
}
