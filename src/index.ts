import chalk from "chalk";
import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { resolve } from "path";
import { createSession } from "./lib/auth";
import { StreamingHistoryItem, scrobble } from "./lib/scrobble";
import { getMe } from "./lib/user";
import { notify } from "./utils/notify";

config();

const sleep = async (ms: number) => await new Promise((r) => setTimeout(r, ms));

const main = async () => {
	if (
		!process.env.LASTFM_API_KEY ||
		!process.env.LASTFM_API_SECRET ||
		!process.env.LASTFM_USERNAME ||
		!process.env.LASTFM_PASSWORD
	) {
		throw new Error(
			"Make sure you have all the required environment variables set: LASTFM_API_KEY, LASTFM_API_SECRET, LASTFM_USERNAME, LASTFM_PASSWORD"
		);
	}

	console.log("LAST.FM SCROBBLER\n");

	const token = await createSession();
	const me = await getMe({ token });
	console.log(`Welcome back, ${me.user.name}!\n`);

	await notify({ title: "Last.fm scrobbler", message: `Logged in as ${me.user.name}.` });

	console.log(`Parsing entire streaming history, this may take a while!`);

	const streamingHistoryData = await readFile(
		resolve(process.cwd(), "dist", "streaming_history.json"),
		"utf-8"
	);
	const streamingHistory = JSON.parse(streamingHistoryData) as StreamingHistoryItem[];

	console.log(`Parsed ${streamingHistory.length} items.`);

	const startingIndexPath = resolve(homedir(), ".lastfmscrobbleindex");
	let startingIndex: any = null;
	if (existsSync(startingIndexPath)) {
		startingIndex = parseInt(readFileSync(startingIndexPath, "utf-8").trim());

		if (isNaN(startingIndex) || (!isNaN(startingIndex) && startingIndex < 0)) {
			await notify({ title: "Last.fm JS error", message: `startingIndex is not a number!` });
			process.exit(1);
		} else {
			console.log(`\nResuming from index ${startingIndex}!\n`);
		}
	}

	let i = startingIndex !== null ? startingIndex : 0;

	if (isNaN(i)) {
		await notify({ title: "Last.fm JS error", message: `i is not a number!` });
		process.exit(1);
	}

	const slicedHistory = streamingHistory.slice(i);
	if (slicedHistory.length == 0) {
		await notify({
			title: "Last.fm Scrobbling Complete",
			message: `Successfully scrobbled ${streamingHistory.length} tracks!`
		});
		process.exit(1);
	}

	for await (const stream of slicedHistory) {
		try {
			await sleep(10000);
			await scrobble(i, streamingHistory.length, stream, token);
		} catch (e: any) {
			console.error(e);
			await notify({ title: "Last.fm JS error", message: e.toString() });
			process.exit(1);
		}

		i++;

		await writeFile(startingIndexPath, i.toString(), "utf8");

		// multiple of 10
		if (i % 10 == 0) {
			console.log(chalk.gray("\n―――――――――――――――――――――――――――――――――――――――――――――――――――"));

			const tracksLeft = streamingHistory.slice(i).length;
			const daysToGo = tracksLeft / 2800;
			const daysDone = i / 2800;
			const percent = (daysDone / daysToGo) * 100;

			console.log(`Tracks left to scrobble: ${streamingHistory.slice(i).length}`);
			console.log(`Days to go: ${(streamingHistory.slice(i).length / 2800).toFixed(4)}`);
			console.log(`Percent done: ${percent.toFixed(2)}%`);

			console.log(chalk.gray("―――――――――――――――――――――――――――――――――――――――――――――――――――\n"));
		} else {
			console.log(chalk.gray("\n―――――――――――――――――――――――――――――――――――――――――――――――――――\n"));
		}
	}
};

main().then((_) => console.log(""));
