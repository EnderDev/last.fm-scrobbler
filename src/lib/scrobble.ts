import axios, { AxiosError } from "axios";
import chalk from "chalk";
import { writeFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";
import retry from "retry";
import { inspect } from "util";
import { notify } from "../utils/notify";
import { signRequest } from "../utils/sig";

export interface StreamingHistoryItem {
	ts: string;
	username: string;
	platform: string;
	ms_played: number;
	conn_country: string;
	ip_addr_decrypted: string;
	user_agent_decrypted: string;
	master_metadata_track_name: string;
	master_metadata_album_artist_name: string;
	master_metadata_album_album_name: string;
	spotify_track_uri: string;
	episode_name?: string;
	episode_show_name?: string;
	spotify_episode_uri?: string;
	reason_start: string;
	reason_end?: string;
	shuffle: boolean;
	skipped?: boolean;
	offline: boolean;
	offline_timestamp: number;
	incognito_mode: boolean;
	endTime: string;
}

const daysBetween = (ms: number) => {
	return Math.round(Math.abs((Date.now() - ms) / (24 * 60 * 60 * 1000)));
};

// to be safe, make everything optional so we HAVE to check if they exist
export const scrobble = async (
	index: number,
	maxScrobbles: number,
	stream: Partial<StreamingHistoryItem>,
	token: string
) => {
	const body: any = {
		api_key: process.env.LASTFM_API_KEY,
		sk: token
	};

	if (
		!stream.master_metadata_track_name ||
		!stream.master_metadata_album_artist_name ||
		!stream.ts
	) {
		return;
	}

	const fourteenDayCutoff = new Date();
	fourteenDayCutoff.setDate(fourteenDayCutoff.getDate() - 13);

	body.track = stream.master_metadata_track_name;
	body.artist = stream.master_metadata_album_artist_name;
	body.timestamp = new Date(stream.ts).getTime();

	if (stream.master_metadata_album_album_name) {
		body.album = stream.master_metadata_album_album_name;
	}

	if (stream.master_metadata_album_artist_name) {
		body.albumArtist = stream.master_metadata_album_artist_name;
	}

	const scrobbleTitle = `${body.track} by ${body.artist}`;
	const workingTitle = `${scrobbleTitle}${body.album ? ` on ${body.album} ` : ` `}${stream.ts} (${
		index + 1
	}/${maxScrobbles})`;

	console.log(`Scrobbling ${chalk.bold(workingTitle)}`);
	writeFileSync(
		resolve(homedir(), ".lastfmscrobbling"),
		`${scrobbleTitle} from ${new Date(body.timestamp).toLocaleDateString("en-GB", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit"
		})} (${index + 1}/${maxScrobbles.toLocaleString()})`,
		"utf-8"
	);

	if (body.timestamp <= fourteenDayCutoff.getTime()) {
		console.warn(
			chalk.gray(
				`    Unable to send actual scrobble date as it was scrobbled ${daysBetween(
					body.timestamp
				)} days ago!`
			)
		);
		console.warn(
			chalk.gray(
				`    Using ${fourteenDayCutoff.toISOString()} (${daysBetween(
					fourteenDayCutoff.getTime()
				)} days ago) instead.`
			)
		);
		body.timestamp = fourteenDayCutoff.getTime();
	}

	body.timestamp = Math.trunc(body.timestamp / 1000);

	body.api_sig = signRequest("track.scrobble", body, process.env.LASTFM_API_SECRET!);

	const q = new URLSearchParams({
		method: "track.scrobble",
		...body,
		format: "json"
	});

	const operation = retry.operation({
		forever: true,
		factor: 3,
		minTimeout: 3 * 1000,
		maxTimeout: 60 * 1000 * 10 /* 10 mins */,
		randomize: true
	});

	const data = await new Promise((res, rej) => {
		operation.attempt(async (currentAttempt) => {
			try {
				const response = await axios.post(
					`https://ws.audioscrobbler.com/2.0/`,
					q.toString(),
					{
						timeout: 30000,
						headers: {
							"Content-Type": "application/x-www-form-urlencoded"
						}
					}
				);

				if (response.status == 200 && response.data.scrobbles["@attr"].accepted >= 1) {
					res(response.data);
				} else {
					throw new AxiosError(
						`Failed to scrobble ${workingTitle}`,
						"200",
						response.config,
						response.request,
						response
					);
				}
			} catch (e: any) {
				const errorData = {
					method: e.response.config.method,
					url: new URL(e.response.config.url, e.response.config.baseURL).href,
					data: e.response.data,
					headers: {
						req: e.response.config.headers,
						res: e.response.headers
					},
					body: e.response.config.data
				};

				console.error(
					`    ${chalk.red.underline.bold(`Error:`)}`,
					inspect(errorData, false, Infinity, true).split("\n").join("\n    ")
				);
				await notify({
					title: `Last.fm scrobble failure (attempt ${currentAttempt})`,
					message: `${e.toString()}\n\n${
						JSON.stringify(e.response.data, null, 4) || "no data"
					}`
				});

				if (operation.retry(e)) {
					return;
				}
			}
		});
	});

	console.log(
		`    ${chalk.green.underline.bold(`Success:`)}`,
		chalk.gray(inspect(data, false, Infinity, true).split("\n").join("\n    "))
	);
};
