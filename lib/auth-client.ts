import { polarClient } from "@polar-sh/better-auth";
import { createAuthClient } from "better-auth/react";

const baseURL = process.env.BETTER_AUTH_URL;

export const { signIn, signUp, useSession, signOut } = createAuthClient({
	baseURL,
	plugins: [polarClient()]
});
