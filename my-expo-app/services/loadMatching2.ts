// Load matching service for personalized recommendations
import { Driver, Load } from '@/types/user';

export interface MatchResult {
  load: Load;
  score: number;
  reasons: string[];
  estimatedTime: number;
}

export class LoadMatchingService {
  static instance: LoadMatchingService;

  static getInstance(): LoadMatchingService {
    if (!LoadMatchingService.instance) {
      LoadMatchingService.instance = new LoadMatchingService();
    }
    return LoadMatchingService.instance;
  }

  async getPersonalizedRecommendations(driver: Driver, limit: number = 10): Promise<MatchResult[]> {
    try {
      // For now, return empty array - you can implement matching logic later
      console.log(`Getting personalized recommendations for driver ${driver.id}`);
      return [];
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  private calculateMatchScore(load: Load, driver: Driver): number {
    // Simple scoring algorithm
    let score = 50; // Base score

    // Vehicle type match
    if (load.vehicleTypeRequired === driver.vehicleType) {
      score += 30;
    }

    // Capacity match
    if (driver.vehicleCapacity && driver.vehicleCapacity >= load.weight) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  private getMatchReasons(load: Load, driver: Driver): string[] {
    const reasons: string[] = [];

    if (load.vehicleTypeRequired === driver.vehicleType) {
      reasons.push('Vehicle type matches');
    }

    if (driver.vehicleCapacity && driver.vehicleCapacity >= load.weight) {
      reasons.push('Sufficient capacity');
    }

    if (driver.rating >= 4.5) {
      reasons.push('High driver rating');
    }

    return reasons;
  }
}

export default LoadMatchingService;
