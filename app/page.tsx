import { requireAuth } from "@/modules/auth/utils/auth-utils";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Code Horse - AI-Powered Code Review Platform",
	description: "Automate your code reviews with AI. Connect your GitHub repositories and get instant, intelligent code review feedback on every pull request.",
};

/**
 * Root Page (Home)
 *
 * The entry point of the application.
 * - Checks for authentication using `requireAuth`.
 * - If authenticated, redirects the user to the `/dashboard`.
 * - If not authenticated, `requireAuth` will handle the redirection to the sign-in page.
 */
export default async function Home() {
	await requireAuth();

	return redirect("/dashboard");
}
