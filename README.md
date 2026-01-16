# Aerovert-DE 🇩🇪✈️

**The Vertical Conflict: Mapping the Collision Course of Germany’s Renewable Energy and Airspace Safety.**

Aerovert-DE is a geospatial intelligence platform designed to ingest, parse, and visualize temporary vertical obstacles (wind turbines, cranes, masts) in German airspace. It processes raw monthly NOTAM (Notice to Air Missions) data to provide an interactive collision risk map.

## 🏗 Architecture

**Option B: Portfolio + Production Stack**

* **Backend:** Python 3.12, FastAPI, SQLAlchemy (Async), Pydantic
* **ETL Pipeline:** Pandas (Excel Ingestion) + Regex Parsing
* **Database:** PostgreSQL 16 + PostGIS (Spatial Indexing)
* **Frontend:** Next.js 14 (App Router), TypeScript, MapLibre GL
* **Infrastructure:** Docker Compose, Makefile automation

## 🚀 Quick Start

### Prerequisites
* Docker & Docker Compose
* Make (optional, but recommended)

### Running the App
1.  **Start Services:**
    ```bash
    make up
    ```
2.  **Access:**
    * **Web App:** [http://localhost:3000](http://localhost:3000)
    * **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
    * **Database:** Port `5432` (User: `postgres`, Pass: `password`)

3.  **Stop Services:**
    ```bash
    make down
    ```

## 📂 Directory Structure

```text
aerovert-de/
├── apps/
│   ├── api/          # FastAPI Backend + ETL logic
│   └── web/          # Next.js Frontend
├── data/
│   ├── raw/          # Drop monthly XLS files here (e.g., data/raw/2025/EDGG/)
│   └── processed/    # Debug output for parsing logic
├── infra/            # Docker configurations
└── docker-compose.yml
```

## 🛠 workflows
Ingest Data: Place .xls files in data/raw/{YEAR}/{FIR}/ and trigger the ETL endpoint.
Parsing Logic: Located in apps/api/app/etl/parsers.

**Instruction:**
1.  Save the file.
2.  **Run the following Git commands** to save our progress:

```bash
git add .
git commit -m "build: add root configuration (docker, makefile, gitignore)"