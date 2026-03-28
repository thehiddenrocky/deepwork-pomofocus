# Blog 2: Gamifying the Lead Measure

"What gets measured, gets managed." But in the world of productivity, we often measure the wrong things. We track "lag measures"—tickets closed, lines of code written, or emails sent.

Cal Newport suggests focusing on the **Lead Measure**: the actual hours spent in a state of uninterrupted Deep Work. 

I didn't want a fancy SaaS app to track this. I wanted a raw, local-first audit log that I owned. So, I built a system that streams every focus session directly into a local CSV file. 

### The Reward System: Glitter & Zang
As a performance person, I know that feedback loops matter. To make Deep Work addictive, I engineered a "dopamine loop" into the app. 
- When a session completes, the UI doesn't just change numbers. 
- It triggers a **"Zang" sound** (real-time audio synthesis using `AudioContext`).
- It explodes with **Glitter particles** (JS-driven canvas animation).
- It rolls the "Daily Total" count with a high-speed animation.

### Why a Local CSV?
Because it’s immutable and low-fidelity. Every session I log (e.g., `"Items mastery"`, `"iterms"`) becomes a line of data in my `pomofocus-logs.csv`. It’s my high-fidelity scoreboard. At any point, I can run a simple script to see exactly where my "human resources" are being spent. 

By gamifying the lead measure, I've turned "doing the work" into the reward itself.

---
**Technical Takeaway:** Gamification isn't just for users; it's a powerful tool for self-engineering. Build your own scoreboard.
