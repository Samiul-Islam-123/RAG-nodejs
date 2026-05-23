# SaaS Marketing Insights RAG Pipeline 🚀

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Qdrant](https://img.shields.io/badge/VectorDB-Qdrant-red.svg?style=flat-square&logo=qdrant)](https://qdrant.tech/)
[![Ollama](https://img.shields.io/badge/LLM_Engine-Ollama-orange.svg?style=flat-square)](https://ollama.com/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-blue.svg?style=flat-square&logo=docker)](https://www.docker.com/)

A custom Retrieval-Augmented Generation (RAG) pipeline built using **Node.js**, **Ollama**, and **Qdrant**. This project scrapes, cleans, chunks, and indexes YouTube video transcripts focusing on **SaaS marketing strategies** (such as high-converting GTM playbooks). It retrieves contextually relevant snippets to ground local LLM generation, eliminating hallucinations and providing tactical, results-based business advice.

---

## 🏗️ System Architecture

![System Architecture](image.png)

---

## 🛠️ Tech Stack & Key Choices

- **Runtime**: Node.js (ES Modules syntax).
- **Core LLM**: Local LLM (e.g. Llama-based or Gemma) orchestrated locally via **Ollama**.
- **Embedding Model**: `nomic-embed-text` (768-dimensional vector space) via Ollama.
- **Vector Database**: **Qdrant** running containerized inside **Docker** for fast, high-performance Cosine similarity search.
- **Web Scraping & DOM**: `cheerio` & `axios` for target acquisition.
- **Metadata-Enriched Chunks**: Instead of arbitrary character-splitting, transcripts are broken into logical segments featuring **Summaries** and **Questions** to align vector search closer to user queries.

---

## 📂 Project Directory Structure

```text
├── docker-compose.yml          # Container configuration for Qdrant
├── package.json                # Project dependencies and script endpoints
├── src/
│   ├── VectorDBUtils/
│   │   └── VectorDB.js         # Connection, collection generation, search & upsert APIs
│   ├── data/
│   │   ├── data-processor.js   # Embedding generator, chunk loader & content formatting
│   │   ├── data-scrapper.js    # YouTube transcript scrapper & cleaner
│   │   └── knowledge-base/
│   │       ├── chunk_data/     # Pre-made, manually curated structured JSON chunks
│   │       └── raw-data/
│   │           └── cleaned-data/ # Extracted and stripped transcript files
│   └── pipeline/
│       └── main.js             # Ingestion setup and interactive Query-Response runner
```

---

## 🚀 Setup & Execution Guide

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js** (v18.x or higher)
- **Docker & Docker Compose**
- **Ollama** running locally

### 2. Boot up Qdrant (Docker Container)
Start the vector database instance in the background:
```bash
docker-compose up -d
```
*This exposes the REST API on port `6333` and the gRPC gateway on `6334` with persistent volume storage mapping.*

### 3. Install Dependencies
Initialize node packages:
```bash
npm install
```

### 4. Fetch the Local Models (via Ollama)
Download your embedding model and your text generation model:
```bash
# Pull the 768-dimensional embedding model
ollama pull nomic-embed-text

# Pull your preferred local LLM (e.g. Llama-based or Gemma model)
ollama pull gemma4:31b-cloud
```

### 5. Ingestion Pipeline & Execution
Simply run the pipeline script:
```bash
node src/pipeline/main.js
```

> [!NOTE]
> **Automatic Data Ingestion (First-Time Run)**:
> The pipeline script automatically checks if your Qdrant collection `video_chunks` contains any vector points. 
> - **First run**: If empty, the system automatically kicks off the document processor, vectorizes your manual chunks, and seeds Qdrant.
> - **Subsequent runs**: The system skips ingestion and directly starts the interactive chatbot session to save compute.

---

## 📊 Ingestion & Retrieval Workflow

### Data Structuring (Manual Chunking)
To capture strategic meaning, each chunk is stored with contextual metadata instead of raw text slices:
```json
{
  "chunk_id": 2,
  "videoId": "EsgQ0bQzvZ0",
  "chunk_summary": "The MVP phase: before building the product, define your target customer...",
  "content": "So, like I said, there are phases to this...",
  "questions_on_this_chunk": [
    "What is the MVP phase in SaaS?",
    "How do you validate a SaaS idea without building a product?",
    "What is the fake sales call strategy?"
  ]
}
```

### Querying & Context Injection
The search service extracts a `768` dimension embedding of the user's prompt, queries the Qdrant database using cosine similarity, and formats the result into a clean context box:
```javascript
// Example Prompt Context structure fed to the LLM
SYSTEM: You are an expert SaaS marketing advisor.
CONTEXT:
==============================
CONTEXT 1
==============================
Similarity Score: 0.892
Summary: The MVP phase...
Content: [Transcript text...]
Related Questions: - What is the fake sales call strategy?

USER: [User Prompt]
ANSWER:
```
The answer is then streamed token-by-token directly to your console using Ollama's streaming response API.
