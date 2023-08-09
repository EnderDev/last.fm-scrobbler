import axios from "axios";

export const getUser = async (username: string, options?: any) => {
	const body: any = {
		api_key: process.env.LASTFM_API_KEY,

		user: username
	};

	if (options.token) body.sk = options.token;

	const q = new URLSearchParams({
		...body,
		format: "json"
	});

	const res = await axios
		.get(`https://ws.audioscrobbler.com/2.0/?method=user.getInfo&${q.toString()}`)
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

	return res.data;
};

export const getMe = async (options?: any) => {
	return await getUser(process.env.LASTFM_USERNAME!, options);
};
