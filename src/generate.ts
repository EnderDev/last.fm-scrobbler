import { readdirSync, readFileSync, writeFileSync } from "fs";
import { ensureDirSync } from "fs-extra";
import { resolve } from "path";

const cutoff = new Date("2023-03-10T19:26:00.000Z");

const main = () => {
	const dataDir = resolve(process.cwd(), "data");
	const chunks = readdirSync(dataDir);
	const json = chunks
		.map((f) => readFileSync(resolve(dataDir, f), "utf-8"))
		.map((d) => JSON.parse(d));
	const merged = json
		.flat(1)
		.filter((f) => f.ms_played >= 30000 || f.reason_done == "trackdone")
		.filter((f) => new Date(f.ts) <= cutoff)
		.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
		.filter((f) => f.master_metadata_track_name)
		.map((f) => {
			const endTime = new Date(f.ts);
			endTime.setMilliseconds(endTime.getMilliseconds() + f.ms_played);

			return {
				...f,
				endTime: endTime.toISOString()
			};
		});

	ensureDirSync(resolve(process.cwd(), "dist"));
	writeFileSync(
		resolve(process.cwd(), "dist", "streaming_history.json"),
		JSON.stringify(merged, null, 4)
	);

	console.log(merged[0], merged[1], merged[merged.length - 2], merged[merged.length - 1]);
	console.log(merged.length, merged.length / 2800);
};

main();
