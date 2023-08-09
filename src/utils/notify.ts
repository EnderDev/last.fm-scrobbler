import axios from "axios";
import notifier from "node-notifier";

export const notify = async ({ title, message }: { title: string; message: string }) => {
	notifier.notify({
		title: title,
		message: message
	});

	try {
		const PushBullet = (await import("pushbullet")).default;

		const pusher =
			process.env.PUSHBULLET_API_KEY && new PushBullet(process.env.PUSHBULLET_API_KEY);

		const devices = await axios.get("https://api.pushbullet.com/v2/devices", {
			headers: { "access-token": process.env.PUSHBULLET_API_KEY }
		});

		for await (const device of devices.data.devices) {
			await pusher.note(device.iden, title, message);
		}
	} catch (e) {}

	return true;
};
