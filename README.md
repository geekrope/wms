The project implements a lightweight Warehouse Management System via an SQLite database.

# Features
* **Item ranking:** Automated sorting based on expiration date, status, and physical accessibility (calculated by the weight of boxes obstructing the target item).
* **Graph box model:** A directed acyclic graph (DAG) models the physical blockages of the box stacks
* **Analytics:** Visual activity heatmaps, linear regression modeling, and statistical drift detection in item counts.

# Tech Stack
* **Database / Queries:** SQLite
* **Graph visualization:** [vis-network](https://github.com/visjs/vis-network)
* **Stats:** [math.js](https://github.com/josdejong/mathjs), [statistics.js](https://github.com/thisancog/statistics.js)
* **Frontend:** TypeScript, HTML5, CSS3

## Key Algorithms & Logic
* **Data Pagination:** Heap data structure for pagination
* **Graph Traversal & Layout:** Dijkstra and 3 color DFS cycle finding algorithm for box layout
* **Statistical Inference:** t-stat for conducting the statistical test for non-zero mean presence

**Live Demo:** [https://geekrope.github.io/wms/](https://geekrope.github.io/wms/)

<img width="1776" height="1256" alt="Screenshot 2026-08-28 023024" src="https://github.com/user-attachments/assets/4a65d2bf-8157-48b1-9fba-ee1a29b4eae0" />
<img width="1944" height="454" alt="image" src="https://github.com/user-attachments/assets/47736c83-afc7-450b-a242-6b0a8ad23446" />