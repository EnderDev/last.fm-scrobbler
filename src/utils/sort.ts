export function sortObject(obj: object) {
	return Object.keys(obj)
		.sort()
		.reduce(function (result: any, key: any) {
			result[key] = (obj as any)[key];
			return result;
		}, {});
}
