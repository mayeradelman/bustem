## Improving Counterfeit Detection Accuracy
- Remove noise - try to isolate the main product in the image by cropping out the model, background, and other irrelevant details.
- Focus on branding elements (logos, tags, unique patterns)
- Compare product names and descriptions alongside images

## Scalable Backend Design

To build a scalable backend for handling many clients running searches for counterfeit items I would implement the following architecture:
- Robust server or serverless architecture that handles client requests, queues up tasks (running on external ), and immediately responds to clients.
- Tasks run searches from clients in the background and store results in a database as they complete.
- Clients poll the server for results on an interval or refresh basis (or use WebSockets if real-time updates are deemed necessary).

## Further Code Improvements
- Advanced typing
- Avoid refetching target image once already fetched
- Increased parallelism when making network requests (e.g., fetching more images concurrently)
- Write results to a database for persistence
- Use react query to cache results on the client side