import axios from "axios";
import readline from "readline";
import { generateEmbeddings, loadChunks, prepareEmbeddingsContent } from "../data/data-processor.js";
import { insertEmbedding, search, getPointsCount } from "../VectorDBUtils/VectorDB.js";

const SYSTEM_PROMPT = `
You are an elite SaaS marketing strategist and growth advisor.

Your job is to:
- Analyze the retrieved knowledge carefully
- Give practical, detailed, and strategic answers
- you should be able to generate emails, contents, etc based on the strategies
- Explain WHY strategies work
- Give frameworks, execution steps, examples, and tactical advice
- Combine ideas across multiple retrieved contexts
- Answer like a real senior growth consultant

Rules:
- ONLY use the provided context
- If information is missing, clearly say so
- Do not invent fake strategies
- Prefer actionable insights over generic advice
- Give structured responses
- Use bullet points, frameworks, and examples
- Explain tradeoffs when relevant
`;

async function initRAGPipeline() {
    // load the chunks from the knowledge base
    console.log("Loading chunks from knowledge base...");
    const chunks_per_video = loadChunks();
    const final_chunks = chunks_per_video.flat();
    console.log("Done ...");

    // //generate embeddings for each chunk and insert into vector database
    console.log("Generating embeddings and inserting into vector database...");
    for (const chunk of final_chunks) {
        // console.log(chunk)
        console.log(`Processing chunk: ${chunk.chunk_id} from video: ${chunk.videoId}`);
        console.log("Vectorizing content...");
        const content = prepareEmbeddingsContent(chunk, "SAAS marketting stratergy");
        const embedding = await generateEmbeddings(content);
        console.log("Inserting embedding into vector database...");
        // console.log(embedding.embedding)
        await insertEmbedding(chunk.chunk_id, embedding.embedding, { video_id: chunk.videoId, chunk_summary: chunk.chunk_summary, content: chunk.content, questions_on_this_chunk: chunk.questions_on_this_chunk, video_title: chunk.video_title ? chunk.video_title : "SAAS marketting stratergy" }, "video_chunks");
        console.log("Done ...")
    }

    console.log("Ingestion Pipeline completed successfully.");

}

function buildContext(searchResults) {
    return searchResults
        .map((result, index) => {
            const payload = result.payload;

            return `
==============================
CONTEXT ${index + 1}
==============================

Similarity Score:
${result.score}

Summary:
${payload.chunk_summary}

Content:
${payload.content}

Related Questions:
${payload.questions_on_this_chunk.join("\n")}
`;
        })
        .join("\n\n");
}


async function askLLM(prompt, context, chatHistory = []) {
    try {

        let historyStr = "";
        if (chatHistory.length > 0) {
            historyStr = "\nCHAT HISTORY:\n" + chatHistory.map(h => `${h.role === "user" ? "USER" : "ASSISTANT"}: ${h.content}`).join("\n") + "\n";
        }

        // Full prompt sent to model
        const full_prompt = `
SYSTEM:
You are an expert SaaS marketing advisor.

CONTEXT:
${context}
${historyStr}
USER:
${prompt}

ANSWER:
        `.trim();

        // Send request to Ollama
        const response = await axios.post(
            "http://localhost:11434/api/generate",
            {
                model: "gemma4:31b-cloud",
                prompt: full_prompt,
                temperature: 0.7,
                stream: true
            },
            {
                responseType: "stream",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        // Final full response
        let finalResponse = "";

        console.log("LLM Response:");

        // Listen to streamed chunks
        response.data.on("data", (chunk) => {

            // Convert buffer -> string
            const lines = chunk.toString().split("\n");

            for (const line of lines) {

                // Ignore empty lines
                if (!line.trim()) continue;

                try {

                    // Ollama sends JSON per line
                    const parsed = JSON.parse(line);

                    // Stream token live
                    if (parsed.response) {
                        process.stdout.write(parsed.response);

                        // Save token
                        finalResponse += parsed.response;
                    }

                    // When model finished
                    if (parsed.done) {
                        console.log("\n\nDone generating.\n");
                    }

                } catch (err) {
                    // Ignore broken partial JSON chunks
                }
            }
        });

        // Wait until stream finishes
        await new Promise((resolve) => {
            response.data.on("end", resolve);
        });

        return finalResponse;

    } catch (error) {

        console.log(error);

        throw new Error(`Error asking LLM: ${error.message}`);
    }
}

// Helper function to prompt user for input and return a promise
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function main() {

    // Automatically check if the vector database has been seeded
    console.log("Checking vector database status...");
    const pointsCount = await getPointsCount("video_chunks");
    if (pointsCount === 0) {
        console.log("Database is empty. Starting initial data ingestion pipeline...");
        await initRAGPipeline();
        console.log("Ingestion completed! Ready to chat.\n");
    } else {
        console.log(`Vector database contains ${pointsCount} active knowledge chunks. Ready to chat.\n`);
    }

    console.log("SaaS Growth Advisor Chatbot Initialized!");
    console.log("Type 'exit' or 'quit' to end the session.\n");

    const chatHistory = [];

    while (true) {
        const user_prompt = await askQuestion("\nYou: ");

        if (!user_prompt || user_prompt.trim() === "") {
            continue;
        }

        const normalizedPrompt = user_prompt.trim();

        if (normalizedPrompt.toLowerCase() === "exit" || normalizedPrompt.toLowerCase() === "quit") {
            console.log("Goodbye! 👋");
            break;
        }

        // Generate embedding for current query
        const query_embedding = await generateEmbeddings(normalizedPrompt);

        // Retrieve top-K relevant contexts from Qdrant
        const search_results = await search("video_chunks", query_embedding.embedding, 5);

        // Format retrieved contexts
        const context = buildContext(search_results);

        // Pass query, contexts, and conversation history to LLM
        const llm_response = await askLLM(normalizedPrompt, context, chatHistory);

        // Save conversation history turn
        chatHistory.push({ role: "user", content: normalizedPrompt });
        chatHistory.push({ role: "assistant", content: llm_response });
    }
}

main();
