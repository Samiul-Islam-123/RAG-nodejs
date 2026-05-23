import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KNOWLEDGE_BASE_PATH = path.join(
    __dirname,
    "knowledge-base"
);
const CHUNKS_PATH = path.join(
    KNOWLEDGE_BASE_PATH,
    "chunk_data"
);

//load chunks
export const loadChunks = () => {
    const chunkFile_names = fs
        .readdirSync(CHUNKS_PATH)
        .filter((file) => file.endsWith(".json"));

    const chunks = [];

    for (const file of chunkFile_names) {
        const filePath = path.join(CHUNKS_PATH, file);

        try {
            const raw = fs.readFileSync(filePath, "utf-8");
            console.log(`📂 Processing file: ${file}`)
            // console.log(raw)

            // skip empty files
            if (!raw || raw.trim() === "") {
                console.warn(`⚠️ Empty file skipped: ${file}`);
                continue;
            }

            const parsed = JSON.parse(raw);
            chunks.push(parsed);
        } catch (err) {
            console.error(`❌ Failed parsing file: ${file}`);
            console.error(err.message);
        }
    }


    return chunks;
};

//generate embeddings
export function prepareEmbeddingsContent(chunk, videoTitle) {
    return `
TITLE: ${videoTitle}

SUMMARY: ${chunk.chunk_summary}

CONTENT: ${chunk.content}

POSSIBLE QUESTIONS:
${chunk.questions_on_this_chunk.map(q => "- " + q).join("\n")}
    `.trim();
}

export async function generateEmbeddings(content) {
    try {
        const response = await axios.post(`http://localhost:11434/api/embeddings`, {
            model: "nomic-embed-text",
            prompt: content
        }, {
            headers: {
                "Content-Type": "application/json"
            }
        });
        return response.data;
    } catch (err) {
        console.error("Error generating embeddings:", err.message);
    }
}


// //main for isolation tests
// async function main() {
//     console.log(" Loading chunks from JSON files...");
//     const chunks_per_video = loadChunks();
//     const final_chunks = chunks_per_video.flat();
//     //console.log(final_chunks);
//     console.log('Done ...');
//     console.log(" Generating embeddings for each chunk...");
//     for(const chunk of final_chunks) {
//         console.log(`Processing chunk: ${chunk.chunk_id} from video: ${chunk.video_id}`);
//         const content = prepareEmbeddingsContent(chunk, "SAAS marketting stratergy");
//         const embedding = await generateEmbeddings(content);
//         console.log("Done ...")
//     }

    
// }

// main();