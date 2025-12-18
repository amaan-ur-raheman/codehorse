import { createAuthClient } from "better-auth/react";

const baseURL = process.env.BETTER_AUTH_URL;

if (!baseURL) {
	throw new Error("BETTER_AUTH_URL environment variable is not defined");
}

export const { signIn, signUp, useSession, signOut } = createAuthClient({
	baseURL,
});
