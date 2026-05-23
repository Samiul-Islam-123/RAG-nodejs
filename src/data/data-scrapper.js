import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";


const KNOWLEDGE_BASE_PATH = "./knowledge-base/raw-data";

async function transcriptYoutubeVideo(video_ids) {
    const API_KEY = "6a05e72ead9e8ba3ebe9c8f2";

    try {
        const response = await fetch(
            "https://www.youtube-transcript.io/api/transcripts",
            {
                method: "POST",

                headers: {
                    Authorization: `Basic ${API_KEY}`,

                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    ids: video_ids,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(
                `HTTP Error: ${response.status}`
            );
        }

        const data = await response.json();

        return data;
    } catch (error) {
        console.error(
            "Error fetching transcript:",
            error
        );

        return null;
    }
}



async function YoutubeVideoFinder(query, maxResults = 5) {
    try {
        const encodedQuery = encodeURIComponent(query);

        /*
          YouTube Filter Params
    
          sp=EgIYAg%253D%253D
          → This year
    
          sp=EgIYAw%253D%253D
          → This month
    
          sp=EgIQAQ%253D%253D
          → Long videos (>20 mins)
    
          Combined filters:
          Upload date + long videos
        */

        // THIS YEAR + LONG VIDEOS
        const sp =
            "EgIYAhAB"; // uploaded this year + long videos

        const url = `https://www.youtube.com/results?search_query=${encodedQuery}&sp=${sp}`;

        const response = await axios.get(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            },
        });

        const html = response.data;

        // Extract video IDs
        const videoIdMatches = [
            ...html.matchAll(/"videoId":"(.*?)"/g),
        ];

        const uniqueVideoIds = [
            ...new Set(
                videoIdMatches.map((match) => match[1])
            ),
        ];

        const top5 = uniqueVideoIds.slice(0, maxResults);

        const videoUrls = top5.map(
            (id) =>
                `https://www.youtube.com/watch?v=${id}`
        );

        return videoUrls;
    } catch (error) {
        console.error(error);

        return [];
    }
}

async function CleanUpTranscriptions(
    transcription_dir_path
) {

    const OUTPUT_FOLDER = "cleaned-data";
    // Create output folder
    if (
        !fs.existsSync(
            path.join(
                transcription_dir_path,
                OUTPUT_FOLDER
            )
        )
    ) {
        fs.mkdirSync(
            path.join(
                transcription_dir_path,
                OUTPUT_FOLDER
            )
        );
    }

    // Read all files
    const files = fs.readdirSync(
        transcription_dir_path
    );

    // Filter JSON transcript files
    const transcriptFiles = files.filter(
        (file) =>
            file.endsWith(".json") &&
            !file.includes("metadata") &&
            !file.includes("cleaned")
    );

    console.log(
        `Found ${transcriptFiles.length} transcript files\n`
    );

    for (const file of transcriptFiles) {
        try {
            console.log(`Processing: ${file}`);

            const filePath = path.join(
                transcription_dir_path,
                file
            );

            const raw = JSON.parse(
                fs.readFileSync(filePath, "utf-8")
            );

            // ----------------------------
            // EXTRACT BASIC INFO
            // ----------------------------

            const title = raw.title || "";

            const description =
                raw.microformat?.playerMicroformatRenderer
                    ?.description?.simpleText || "";

            const author =
                raw.microformat?.playerMicroformatRenderer
                    ?.ownerChannelName || "";

            const publishDate =
                raw.microformat?.playerMicroformatRenderer
                    ?.publishDate || "";

            const videoId = raw.id || "";

            const transcript =
                raw.tracks?.[0]?.transcript || [];

            // ----------------------------
            // CLEAN TRANSCRIPT
            // ----------------------------

            let cleanedTranscript = "";

            for (const item of transcript) {
                let text = item.text || "";

                // Remove weird spaces
                text = text.replace(/\s+/g, " ").trim();

                // Skip empty lines
                if (!text) continue;

                cleanedTranscript += text + "\n";
            }

            // ----------------------------
            // FINAL CLEANED OBJECT
            // ----------------------------

            const cleanedData = {
                videoId,
                title,
                author,
                publishDate,
                description,
                transcript: cleanedTranscript.trim(),
            };

            // ----------------------------
            // SAVE CLEANED FILE
            // ----------------------------

            const outputPath = path.join(
                transcription_dir_path,
                OUTPUT_FOLDER,
                `${videoId}_cleaned.json`
            );

            fs.writeFileSync(
                outputPath,
                JSON.stringify(cleanedData, null, 2)
            );

            console.log(
                `Saved cleaned transcript -> ${outputPath}\n`
            );
        } catch (error) {
            console.error(
                `Error processing ${file}:`,
                error
            );
        }
    }

    console.log("\nCleanup completed.\n");
}

async function main() {

    // const videos = await YoutubeVideoFinder("SaaS marketing strategy 2026", 45);

    // const ids = videos.map(url => {
    //     const urlObj = new URL(url);
    //     return urlObj.searchParams.get('v');
    // });

    // console.log(ids);

    // console.log(`Fetching transcripts for videos: ${ids.join(", ")}`);
    // const transcripts = await transcriptYoutubeVideo(ids);// this gives an array

    // //save the transcripts 
    // if (!fs.existsSync(KNOWLEDGE_BASE_PATH)) {
    //     fs.mkdirSync(KNOWLEDGE_BASE_PATH, { recursive: true });
    // }

    // console.log(`Saving transcripts to ${KNOWLEDGE_BASE_PATH}...`);
    // transcripts.forEach((transcript, index) => {
    //     const filePath = path.join(KNOWLEDGE_BASE_PATH, `transcript_${index}.json`);
    //     fs.writeFileSync(filePath, JSON.stringify(transcript));
    // });
    // console.log("done ...");

    console.log("Starting cleanup of transcripts...");
    await CleanUpTranscriptions(KNOWLEDGE_BASE_PATH);   
    console.log("done ...");
}


main();