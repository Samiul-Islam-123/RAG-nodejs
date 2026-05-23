import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({
    url: "http://localhost:6333",
});

// CREATE COLLECTION
export async function createCollection(collectionName, vectorSize) {
    try {

        // Check if collection already exists
        const exists = await client.collectionExists(collectionName);

        if (exists.exists) {
            console.log(`Collection already exists: ${collectionName}`);
            return;
        }

        await client.createCollection(collectionName, {
            vectors: {
                size: vectorSize,
                distance: "Cosine",
            },
        });

        console.log(`Collection created: ${collectionName}`);
    } catch (err) {
        console.error("Create collection error:", err.message);
        console.log(err)
    }
}

//to insert embedding
export async function insertEmbedding(id, vector, payload, collectionName) {
    try {
        // console.log(payload)
        await client.upsert(collectionName, {
            points: [
                {
                    id,
                    vector,
                    payload,
                },
            ],
        });

        console.log(`Inserted: ${id}`);
    } catch (err) {
        console.log(err)
        console.error("Insert error:", err.message);
    }
}

//to search with query vector
export async function search(collectionName, queryVector, topK = 5) {
    try {
        const result = await client.search(collectionName, {
            vector: queryVector,
            limit: topK,
        });

        return result;
    } catch (err) {
        console.error("Search error:", err.message);
    }
}

// Check collection size
export async function getPointsCount(collectionName) {
    try {
        const exists = await client.collectionExists(collectionName);
        if (!exists.exists) return 0;
        const info = await client.getCollection(collectionName);
        return info.points_count ?? 0;
    } catch (err) {
        return 0;
    }
}

// console.log("Creating collection for SAAS marketing strategy chunks...");
await createCollection("video_chunks", 768);
// console.log("Collection setup completed.");