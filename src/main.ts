import { readdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { ensureDirSync } from "fs-extra";

const cutoff = new Date("2023-03-10T19:26:00.000Z");

const main = () => {
    const dataDir = resolve(process.cwd(), "data");
    const chunks = readdirSync(dataDir);
    const json = chunks
        .map(f => readFileSync(
            resolve(dataDir, f), 
            "utf-8"
        ))
        .map(d => JSON.parse(d));
    const merged = json.flat(1)
        .filter(f => f.ms_played >= 30000 || f.reason_done == "trackdone")
        .filter(f => new Date(f.ts) <= cutoff)
        .sort((a, b) => new Date(a.ts) - new Date(b.ts))
        .filter(f => f.master_metadata_track_name);
 
    ensureDirSync(resolve(process.cwd(), "dist"));
    writeFileSync(resolve(process.cwd(), "dist", "streaming_history.json"), JSON.stringify(merged, "", 4));

    console.log(merged[0], merged[1], merged[merged.length - 2], merged[merged.length - 1]);
    console.log(merged.length, merged.length / 3000);
}

main();
