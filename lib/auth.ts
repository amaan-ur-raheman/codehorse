import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
	polar,
	checkout,
	portal,
	usage,
	webhooks,
} from "@polar-sh/better-auth";

import prisma from "./db";
import { polarClient } from "@/modules/payment/config/polar";
import {
	SubscriptionTier,
	updatePolarCustomerId,
	updateUserTier,
} from "@/modules/payment/lib/subscription";

if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
	throw new Error("Missing required GitHub OAuth environment variables");
}

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	socialProviders: {
		github: {
			clientId: process.env.GITHUB_CLIENT_ID,
			clientSecret: process.env.GITHUB_CLIENT_SECRET,
			scope: ["repo"],
		},
	},
	trustedOrigins: [
		"http://localhost:3000",
		"https://codehorse.vercel.app",
		"https://kamden-epeiric-caiden.ngrok-free.dev",
	],
	plugins: [
		polar({
			client: polarClient,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products: [
						{
							productId: "087676b3-70c9-4135-943c-5892a93a92b8",
							slug: "pro", // Custom slug for easy reference in Checkout URL, e.g. /checkout/pro
						},
					],
					successUrl:
						process.env.POLAR_SUCCESS_URL ||
						"/dashboard/subscriptions?success=true",
					authenticatedUsersOnly: true,
				}),
				portal({
					returnUrl:
						process.env.NEXT_PUBLIC_APP_URL ||
						"http://localhost:3000/dashboard",
				}),
				usage(),
				webhooks({
					secret: process.env.POLAR_WEBHOOK_SECRET!,
					onSubscriptionActive: async (payload) => {
						const customerId = payload.data.customerId;

						const user = await prisma.user.findUnique({
							where: {
								polarCustomerId: customerId,
							},
						});

						if (user) {
							await updateUserTier(
								user.id,
								"PRO",
								"ACTIVE",
								payload.data.id
							);
						}
					},
					onSubscriptionCanceled: async (payload) => {
						const customerId = payload.data.customerId;

						const user = await prisma.user.findUnique({
							where: {
								polarCustomerId: customerId,
							},
						});

						if (user) {
							await updateUserTier(
								user.id,
								user.subscriptionStatus as SubscriptionTier,
								"CANCELLED"
							);
						}
					},
					onSubscriptionRevoked: async (payload) => {
						const customerId = payload.data.customerId;

						const user = await prisma.user.findUnique({
							where: {
								polarCustomerId: customerId,
							},
						});

						if (user) {
							await updateUserTier(user.id, "FREE", "EXPIRED");
						}
					},
					onOrderPaid: async () => {},
					onCustomerCreated: async (payload) => {
						const user = await prisma.user.findUnique({
							where: {
								email: payload.data.email,
							},
						});

						if (user) {
							await updatePolarCustomerId(
								user.id,
								payload.data.id
							);
						}
					},
				}),
			],
		}),
	],
});
