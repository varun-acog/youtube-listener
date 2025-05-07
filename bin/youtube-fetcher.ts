#!/usr/bin/env -S npx tsx
// bin/youtube-fetcher.ts
import { searchDiseaseVideos, VideoMetadata } from "../lib/youtube";
import { safeLog } from "../lib/logger";
import fs from "fs/promises";
import path from "path";
import { storeVideo } from "../lib/database";

interface Options {
  searchName?: string;
  disease?: string;
  searchPhrases?: string[];
  maxResults?: number;
  outputFile?: string;
  videoIdsFile?: string;
  videoId?: string;
  startDate?: string;
  endDate?: string;
}

async function storeSearchConfig(userId: string, searchPhrase: string, searchName: string) {
  try {
    const pool = await (await import("../lib/database")).getPool();
    await pool.query(
      `INSERT INTO SearchConfig (user_id, search_phrase, search_name, creation_date)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (search_name) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         search_phrase = EXCLUDED.search_phrase,
         creation_date = NOW()`,
      [userId, searchPhrase, searchName]
    );
    safeLog("info", `✅ Stored SearchConfig for search_name ${searchName}`);
  } catch (error) {
    safeLog("error", `❌ Error storing SearchConfig:`, error);
    throw error;
  }
}

async function appendToJsonFile(filePath: string, videos: VideoMetadata[]) {
  try {
    let existingData: VideoMetadata[] = [];
    try {
      const content = await fs.readFile(filePath, "utf-8");
      existingData = JSON.parse(content);
    } catch (error) {
      existingData = [];
    }

    const allVideos = [...existingData, ...videos];
    const uniqueVideos = Array.from(new Map(allVideos.map(video => [video.id, video])).values());

    await fs.writeFile(filePath, JSON.stringify(uniqueVideos, null, 2));
    safeLog("info", `✅ Appended ${videos.length} videos to ${filePath}, total unique videos: ${uniqueVideos.length}`);
  } catch (error) {
    safeLog("error", `❌ Error appending to ${filePath}:`, error);
    throw error;
  }
}

async function appendVideoIdsToJsonFile(filePath: string, videoIds: string[]) {
  try {
    let existingIds: string[] = [];
    try {
      const content = await fs.readFile(filePath, "utf-8");
      existingIds = JSON.parse(content);
    } catch (error) {
      existingIds = [];
    }

    const allIds = [...existingIds, ...videoIds];
    const uniqueIds = Array.from(new Set(allIds));

    await fs.writeFile(filePath, JSON.stringify(uniqueIds, null, 2));
    safeLog("info", `✅ Appended ${videoIds.length} video IDs to ${filePath}, total unique IDs: ${uniqueIds.length}`);
  } catch (error) {
    safeLog("error", `❌ Error appending to ${filePath}:`, error);
    throw error;
  }
}

async function main() {
  const options: Options = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--search-name" && i + 1 < args.length) {
      options.searchName = args[i + 1];
      i++;
    } else if (args[i] === "--disease" && i + 1 < args.length) {
      options.disease = args[i + 1];
      i++;
    } else if (args[i] === "--search-phrase" && i + 1 < args.length) {
      options.searchPhrases = args[i + 1].split(",").map(phrase => phrase.trim());
      i++;
    } else if (args[i] === "--max-results" && i + 1 < args.length) {
      options.maxResults = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--output-file" && i + 1 < args.length) {
      options.outputFile = args[i + 1];
      i++;
    } else if (args[i] === "--video-ids-file" && i + 1 < args.length) {
      options.videoIdsFile = args[i + 1];
      i++;
    } else if (args[i] === "--video-id" && i + 1 < args.length) {
      options.videoId = args[i + 1];
      i++;
    } else if (args[i] === "--start-date" && i + 1 < args.length) {
      options.startDate = args[i + 1];
      i++;
    } else if (args[i] === "--end-date" && i + 1 < args.length) {
      options.endDate = args[i + 1];
      i++;
    }
  }

  const searchName = options.searchName || options.disease;
  if (!searchName && !options.videoId) {
    safeLog("error", "Usage: youtube-fetcher.ts --search-name <search_name> [--search-phrase <phrases>] [--max-results <number>] [--output-file <file>] [--video-ids-file <file>] [--start-date <YYYY-MM-DD>] [--end-date <YYYY-MM-DD>]");
    safeLog("error", "       youtube-fetcher.ts --disease <disease_name> [--search-phrase <phrases>] [--max-results <number>] [--output-file <file>] [--video-ids-file <file>] [--start-date <YYYY-MM-DD>] [--end-date <YYYY-MM-DD>]");
    safeLog("error", "       youtube-fetcher.ts --video-id <video_id> [--output-file <file>] [--video-ids-file <file>]");
    process.exit(1);
  }

  try {
    let totalVideosFetched = 0;

    if (options.videoId) {
      const youtubeService = new (await import("../lib/youtube-service")).YouTubeService();
      const video = await youtubeService.getVideoDetails(options.videoId);
      if (video) {
        const videoWithSearchName = { ...video, search_name: searchName || options.videoId };
        if (options.outputFile) {
          await appendToJsonFile(options.outputFile, [videoWithSearchName]);
        }
        if (options.videoIdsFile) {
          await appendVideoIdsToJsonFile(options.videoIdsFile, [videoWithSearchName.id]);
        }
        await storeVideo(videoWithSearchName);
        safeLog("info", `✅ Processed and stored video ${videoWithSearchName.id}`);
        totalVideosFetched = 1;
      } else {
        safeLog("warn", `❌ No metadata found for video ${options.videoId}`);
      }
    } else {
      const searchPhrases = options.searchPhrases || [searchName!];
      const searchOptions: any = { 
        maxResults: options.maxResults,
        startDate: options.startDate,
        endDate: options.endDate,
      };

      if (options.outputFile) {
        await fs.writeFile(options.outputFile, "[]");
      }
      if (options.videoIdsFile) {
        await fs.writeFile(options.videoIdsFile, "[]");
      }

      for (const phrase of searchPhrases) {
        safeLog("info", `🔍 Fetching videos for phrase "${phrase}" with options: ${JSON.stringify(searchOptions)}`);
        let phraseVideosFetched = 0;
        const fetchedCount = await searchDiseaseVideos(phrase, searchOptions, async (videos: VideoMetadata[]) => {
          const videosWithSearchName = videos.map(video => ({ ...video, search_name: searchName }));

          if (options.outputFile) {
            await appendToJsonFile(options.outputFile, videosWithSearchName);
          }

          if (options.videoIdsFile) {
            const videoIds = videosWithSearchName.map(video => video.id);
            await appendVideoIdsToJsonFile(options.videoIdsFile, videoIds);
          }

          for (const video of videosWithSearchName) {
            try {
              await storeVideo(video);
              safeLog("info", `✅ Stored video ${video.id} in database`);
            } catch (error) {
              safeLog("error", `❌ Error storing video ${video.id}:`, error);
            }
          }

          phraseVideosFetched += videosWithSearchName.length;
        });
        totalVideosFetched += fetchedCount;
        safeLog("info", `✅ Completed fetching videos for phrase "${phrase}", total fetched: ${fetchedCount}`);
      }
    }

    const searchPhraseToStore = options.searchPhrases ? options.searchPhrases.join(", ") : searchName!;
    await storeSearchConfig("default_user", searchPhraseToStore, searchName!);

    if (options.outputFile) {
      const finalData = JSON.parse(await fs.readFile(options.outputFile, "utf-8"));
      safeLog("info", `✅ Final metadata file ${options.outputFile} contains ${finalData.length} unique videos`);
    }
    if (options.videoIdsFile) {
      const finalIds = JSON.parse(await fs.readFile(options.videoIdsFile, "utf-8"));
      safeLog("info", `✅ Final video IDs file ${options.videoIdsFile} contains ${finalIds.length} unique IDs`);
    }

    safeLog("info", `✅ Total videos fetched and stored: ${totalVideosFetched}`);
  } catch (error) {
    safeLog("error", "❌ Error:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  safeLog("error", "Unhandled error:", error);
  process.exit(1);
});