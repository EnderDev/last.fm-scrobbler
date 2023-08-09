import { createHash } from "crypto";

export const md5 = (data: any) => {
	return createHash("md5").update(data, "utf-8").digest("hex");
};
