import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export function validateContract(schema: object, payload: unknown) {
  const validate = ajv.compile(schema);
  const valid = validate(payload);
  return {
    valid: Boolean(valid),
    errors: validate.errors ?? [],
  };
}
