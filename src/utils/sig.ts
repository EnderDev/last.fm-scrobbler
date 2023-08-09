import { md5 } from "./md5";

export const signRequest = (method: string, data: any, secretKey: string) => {
	data.method = method;

	let str = "";

	const keys = Object.keys(data).sort();

	for (const i of keys) {
		str += Buffer.from(i, "utf-8").toString();
		str += Buffer.from(data[i].toString(), "utf-8").toString();
	}

	str += Buffer.from(secretKey, "utf-8").toString();

	const hashed = md5(str);

	return hashed;
};
