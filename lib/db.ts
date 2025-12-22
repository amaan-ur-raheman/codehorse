import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
	return new PrismaClient({
		adapter,
	});
};

declare const globalThis: {
	prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal || prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
	globalThis.prismaGlobal = prisma;
}

export default prisma;
