export type AppointmentConfirmData = {
	clientName: string;
	serviceName: string;
	date: string; // "venerdì 25 aprile 2026"
	time: string; // "15:30"
	businessName?: string;
};

export function renderAppointmentConfirm(d: AppointmentConfirmData): {
	subject: string;
	html: string;
	text: string;
} {
	const business = d.businessName ?? "Fior di Loto";
	const subject = `Il tuo appuntamento del ${d.date} è confermato`;
	const text = `Ciao ${d.clientName},

il tuo appuntamento per ${d.serviceName} è confermato:
📅 ${d.date}
🕐 ${d.time}

Ti aspettiamo da ${business}!
Se hai bisogno di modificarlo, rispondi a questa email.`;

	const html = `<!DOCTYPE html>
<html lang="it">
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #FAF8F5; padding: 24px; color: #3D2817;">
	<div style="max-width: 540px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; border: 1px solid #EDE4D8;">
		<h1 style="font-size: 20px; margin: 0 0 16px;">Ciao ${d.clientName} 🌸</h1>
		<p style="margin: 0 0 16px; color: #5E4632;">Il tuo appuntamento è confermato:</p>
		<div style="background: #FAF8F5; border-radius: 8px; padding: 16px; margin: 16px 0;">
			<p style="margin: 0 0 4px;"><strong>${d.serviceName}</strong></p>
			<p style="margin: 0; color: #5E4632;">📅 ${d.date} — 🕐 ${d.time}</p>
		</div>
		<p style="margin: 16px 0 0; color: #5E4632;">Ti aspettiamo da ${business}!</p>
		<p style="margin: 8px 0 0; font-size: 13px; color: #8B7866;">
			Se hai bisogno di modificarlo, basta rispondere a questa email.
		</p>
	</div>
</body>
</html>`;

	return { subject, html, text };
}
