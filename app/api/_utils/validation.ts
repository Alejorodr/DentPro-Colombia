import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export async function parseJson<T>(request: Request, schema: ZodSchema<T>) {
  const body = await request.json().catch(() => null);
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        { error: "Datos inválidos.", details: formatZodError(result.error) },
        { status: 400 },
      ),
    };
  }

  return { data: result.data, error: null };
}
