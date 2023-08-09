export function sortObject(obj: object) {
	return Object.keys(obj)
		.sort()
		.reduce(function (result, key) {
			result[key] = obj[key];
			return result;
		}, {});
}
