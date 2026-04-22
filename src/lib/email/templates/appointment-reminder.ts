export type AppointmentReminderData = {
	clientName: string;
	serviceName: string;
	date: string;
	time: string;
	businessName?: string;
};

export function renderAppointmentReminder(d: AppointmentReminderData): {
	subject: string;
	html: string;
	text: string;
} {
	const business = d.businessName ?? "Fior di Loto";
	const subject = `Promemoria: domani ${d.time} - ${d.serviceName}`;
	const text = `Ciao ${d.clientName},

ti ricordiamo il tuo appuntamento di domani:
📅 ${d.date}
🕐 ${d.time}
💆 ${d.serviceName}

A domani!
${business}`;

	const html = `<!DOCTYPE html>
<html lang="it">
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #FAF8F5; padding: 24px; color: #3D2817;">
	<div style="max-width: 540px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; border: 1px solid #EDE4D8;">
		<h1 style="font-size: 20px; margin: 0 0 16px;">Ciao ${d.clientName} 🌸</h1>
		<p style="margin: 0 0 16px; color: #5E4632;">Ti ricordiamo il tuo appuntamento di <strong>domani</strong>:</p>
		<div style="background: #FAF8F5; border-radius: 8px; padding: 16px; margin: 16px 0;">
			<p style="margin: 0 0 4px;"><strong>${d.serviceName}</strong></p>
			<p style="margin: 0; color: #5E4632;">📅 ${d.date} — 🕐 ${d.time}</p>
		</div>
		<p style="margin: 16px 0 0; color: #5E4632;">A domani!</p>
		<p style="margin: 4px 0 0; color: #8B7866; font-size: 13px;">${business}</p>
	</div>
</body>
</html>`;

	return { subject, html, text };
}
