import { CheerioCrawler } from 'crawlee';
import { URL } from 'node:url';

const crawler = new CheerioCrawler({
    minConcurrency: 10,
    maxConcurrency: 50,

    maxRequestRetries: 1,
    requestHandlerTimeoutSecs: 30,
    // maxRequestsPerCrawl: 10,


    async requestHandler({ request, $ }) {
        // if (crawler.requestQueue.inProgress.size < 100) {
            
            const queue = crawler.requestQueue;
        const links = $('a[href]')
            .map((_, el) => $(el).attr('href'))
            .get();
            const info = await queue.getInfo();
        // Then we need to resolve relative URLs,
        // otherwise they would be unusable for crawling.
        const absoluteUrls = links
            .map((link) => new URL(link, request.loadedUrl).href);
        console.log(crawler.requestQueue.assumedTotalCount)
        console.log(crawler.requestQueue.inProgress.size)
        console.log("pending request count " + info.pendingRequestCount)
        if(crawler.requestQueue.assumedTotalCount > 1000){
            crawler.requestQueue.drop();
        }
        await crawler.addRequests(absoluteUrls);
        // }
    },
});

await crawler.run(['https://crawlee.dev']);