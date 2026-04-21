"use server";

import { getResend, getFromAddress } from "@/lib/email/client";

export type SendEmailInput = {
	to: string | string[];
	subject: string;
	html: string;
	text?: string;
	replyTo?: string;
};

export type SendEmailResult =
	| { ok: true; id: string }
	| { ok: false; error: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
	try {
		const resend = getResend();
		const { data, error } = await resend.emails.send({
			from: getFromAddress(),
			to: input.to,
			subject: input.subject,
			html: input.html,
			text: input.text,
			replyTo: input.replyTo,
		});
		if (error) return { ok: false, error: error.message };
		if (!data?.id) return { ok: false, error: "No message id returned" };
		return { ok: true, id: data.id };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : "send failed" };
	}
}
