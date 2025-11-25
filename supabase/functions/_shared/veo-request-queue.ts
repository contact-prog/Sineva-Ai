/**
 * VEO Request Queue Manager
 * Handles rate limiting and request queuing for VEO API calls
 */

export class VeoRequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerMinute = 60; // VEO 3.1 limit: 1 request per second
  private requestInterval = 60000 / this.requestsPerMinute; // 1000ms between requests
  private lastRequestTime = 0;
  
  /**
   * Enqueue a request for processing with rate limiting
   */
  async enqueue<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  /**
   * Process queued requests with rate limiting
   */
  private async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        try {
          // Ensure minimum interval between requests
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequestTime;
          
          if (timeSinceLastRequest < this.requestInterval) {
            const delay = this.requestInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          this.lastRequestTime = Date.now();
          await request();
        } catch (error) {
          console.error('Queue request failed:', error);
        }
      }
    }
    
    this.processing = false;
  }
  
  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }
  
  /**
   * Check if queue is processing
   */
  isProcessing(): boolean {
    return this.processing;
  }
  
  /**
   * Clear the queue (for emergency situations)
   */
  clear(): void {
    this.queue = [];
    console.log('VEO request queue cleared');
  }
}
