import { parser } from "./parser.js";

export default function parseTableSchema(schema: string) {
  return parser.parse(schema, {});
}
