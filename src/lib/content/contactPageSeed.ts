import type { ContactPageDraftPayload } from "@jessepomeroy/admin";

/** Exact current host-owned Contact & Booking copy for reversible CMS setup. */
export const contactPageSeed: ContactPageDraftPayload = {
	heading: "get in touch",
	intro: "questions about prints, sessions, or just want to say hello — i'd love to hear from you.",
	email: "hello.margarethelena@gmail.com",
	confirmationMessage: "message received — i'll be in touch soon.",
	bookingEnabled: false,
	bookingLabel: "book a session",
	bookingIntro:
		"portrait sessions, editorial work, and botanical commissions. let's make something together.",
	inquiryChoices: ["portrait session", "print inquiry"],
};
