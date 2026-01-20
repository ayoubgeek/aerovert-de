# ✈️ AEROVERT | Strategic Airspace Intelligence

> **A Next-Generation Geospatial Intelligence Platform for VFR Aviation Safety.**
> *Analyzing airspace saturation, obstacle hazards, and compliance metrics in real-time.*

![Dashboard Preview](https://github.com/ayoubgeek/aerovert-de/assets/placeholder-image) ## 🚀 The Mission
Visual Flight Rules (VFR) pilots and Flight Operations Officers often rely on static charts that are updated only once a year. **Aerovert** bridges the gap by visualizing dynamic NOTAM data (Notices to Air Missions) to identify temporary hazards like cranes, unlit wind turbines, and airspace restrictions.

## ⚡ Core Capabilities

### 1. **"The Kill Zone" Matrix** 🎯
A scatter analysis correlating **Obstacle Type** vs. **Altitude**. This instantly identifies high-risk outliers—specifically **Unlit Wind Turbines** penetrating the VFR Cruise Layer (1,000ft - 2,000ft).

### 2. **Safety Compliance Engine** 🛡️
An automated scoring system that scans the entire German airspace (EDWW, EDGG, EDMM) to calculate a real-time **Safety Compliance Rate** based on the ratio of functional vs. defective lighting systems.

### 3. **VFR "Wall" Analysis** 🧱
A vertical density profile that visualizes airspace saturation. It answers the question: *"Is the airspace physically clogged at the altitude where small aircraft need to fly?"*

---

## 🛠️ Tech Stack

* **Core:** [Next.js 14](https://nextjs.org/) (App Router, Server Components)
* **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
* **Visualization:** [Recharts](https://recharts.org/) (Composed Charts, Custom Tooltips)
* **Mapping:** [Leaflet](https://leafletjs.com/) (Interactive Geospatial Layers)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Dark Mode, Glassmorphism)
* **State:** React Context API (Global Filter State Management)

---

## 🧠 Key Architectural Decisions

* **Context-Driven Filtering:** A global `ObstacleContext` manages state across the Sidebar, Map, and Dashboard. Toggling a filter (e.g., "Hide Wind Turbines") instantly recalculates the Compliance Score and Scatter Matrix.
* **Performance Optimization:** Large datasets (GeoJSON) are memoized using `useMemo` hooks to prevent unnecessary re-renders of heavy chart components.
* **Data Hygiene:** Strict filtering logic removes "Ghost Data" (e.g., generic `FL 999` placeholders) to ensure analytics only reflect physical reality.

---

## 📸 Gallery

| **Strategic Dashboard** | **Map Intelligence** |
|:---:|:---:|
| *Real-time analytics & Kill Zone Matrix* | *Geospatial visualization of unlit hazards* |
| [Add Screenshot] | [Add Screenshot] |

---

## 👨‍💻 Author

**Ayoub El Hajji** *Data Engineering Student @ ENSAM Casablanca* *Specializing in Aviation Analytics & Geospatial Data Systems.*

---
*© 2026 Aerovert Project. Built for educational purposes.*