// strategies/factory.js

class StrategyFactory {
  static getStrategy(hostname: string) {
    if (hostname.includes('youtube.com')) return new YouTubeStrategy();
    if (hostname.includes('amazon.com')) return new AmazonStrategy();

    // Fallback
    return new SiteStrategy(); 
  }
}

