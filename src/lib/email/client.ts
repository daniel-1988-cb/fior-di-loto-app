import { Resend } from "resend";

let instance: Resend | null = null;

export function getResend(): Resend {
	if (!instance) {
		const key = process.env.RESEND_API_KEY;
		if (!key) throw new Error("RESEND_API_KEY not configured");
		instance = new Resend(key);
	}
	return instance;
}

export function getFromAddress(): string {
	return process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
}
