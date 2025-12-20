import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const event = request.headers.get("x-github-event");

		console.log(`Received GitHub event: ${event}`);

		if (event === "ping") {
			return NextResponse.json({ message: "Pong" }, { status: 200 });
		}

		return NextResponse.json(
			{ message: "Event processed" },
			{ status: 200 }
		);
	} catch (error) {
		console.error("Error processing webhook:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
