import axios from "axios";
import { signRequest } from "../utils/sig";

export const createSession = async () => {
	const body: any = {
		api_key: process.env.LASTFM_API_KEY,

		username: process.env.LASTFM_USERNAME,
		password: process.env.LASTFM_PASSWORD
	};

	body.api_sig = signRequest("auth.getMobileSession", body, process.env.LASTFM_API_SECRET!);

	const q = new URLSearchParams({
		...body,
		format: "json"
	});

	const res = await axios
		.post(`https://ws.audioscrobbler.com/2.0/?method=auth.getMobileSession&${q.toString()}`)
		.catch((e) => ({
			method: e.response.config.method,
			url: new URL(e.response.config.url, e.response.config.baseURL).href,
			data: e.response.data,
			headers: {
				req: e.response.config.headers,
				res: e.response.headers
			},
			body: e.response.config.data
		}));

	return res.data.session.key;
};
