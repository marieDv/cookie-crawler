import { CheerioCrawler } from 'crawlee';

const crawler = new CheerioCrawler({
  async requestHandler({ request, enqueueLinks, log }) {
    log.info(request.url);
    check_mem();
    // Add all links from page to RequestQueue
    await enqueueLinks({
      // urls: queue,
      strategy: 'all'
    });
  },
  // maxRequestsPerCrawl: 10, // Limitation for only 10 requests (do not use if you want to crawl all links)
});

// Run the crawler with initial request
await crawler.run(['https://crawlee.dev']);


function check_mem() {
  const mem = process.memoryUsage();
  console.log('%f MB used', (mem.heapUsed / 1024 / 1024).toFixed(2))
}