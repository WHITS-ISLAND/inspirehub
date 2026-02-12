import { validator } from "hono/validator";
import { type } from "arktype";

export function arktypeQueryValidator<T>(
  schema: (input: unknown) => T | InstanceType<typeof type.errors>,
) {
  return validator("query", (value, c) => {
    const result = schema(value);
    if (result instanceof type.errors) {
      return c.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: result.summary } },
        400,
      );
    }
    return result as T;
  });
}
