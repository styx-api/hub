# styx2 JSON Schema fixtures

Authentic output of the styx2 compiler (`@styx/core` JSON Schema backend), committed
verbatim so the hub's schema-reconciliation logic is unit-tested against the real
dialect styx2 emits - not a hand-rolled approximation. Regenerate with:

```bash
# from a niwrap checkout, compile a single tool to JSON Schema:
styx build --catalog <pkg-dir> --mode single -b json-schema -o <out>
```

| File                                      | Tool                       | Exercises                                                                                                                                                                                                                                                                             |
| ----------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bet.schema.json`                         | `fsl/bet`                  | scalars, `x-styx-type: "path"`, numeric `minimum`/`maximum`, booleans-with-default, an unbounded number array (`center_of_gravity`), optionals-by-omission-from-`required`                                                                                                            |
| `bet.outputs.schema.json`                 | `fsl/bet`                  | the synthetic `root` output-dir entry + many required path singles                                                                                                                                                                                                                    |
| `antsApplyTransforms.schema.json`         | `ants/antsApplyTransforms` | `oneOf` object unions (each variant tagged by a distinct `@type` const), a **mixed** `oneOf` of literal (`const`) and object variants (`interpolation`), `enum` schemas with no `type` (`dimensionality`, `output_data_type`), lists-of-unions (`transform`, `params`), nested unions |
| `antsApplyTransforms.outputs.schema.json` | `ants/antsApplyTransforms` | `root` + an optional single output (`type: ["string", "null"]`)                                                                                                                                                                                                                       |
| `c3d.outputs.schema.json`                 | `c3d/c3d`                  | a **list** output (`array` of `x-styx-type` paths) named `output`                                                                                                                                                                                                                     |
| `avscale.outputs.schema.json`             | `fsl/avscale`              | a captured **stream** (`array` of plain strings, no `x-styx-type`) named `output` - same field name as c3d's list, different kind, so the classifier must key off `x-styx-type` not the name                                                                                          |

Key dialect facts the hub must honor (see `../schemaUtils.ts`, `../fieldType.ts`,
`../outputsSchema.ts`):

- **Unions are `oneOf`** (canonical - each variant carries a distinct `@type` const,
  so exactly one matches), never `anyOf`.
- **Optionals are omitted from `required`** in the inputs schema - there is no
  `anyOf: [T, null]` and no `null` type branch.
- **Paths** carry `x-styx-type: "path"` (v1 used `"file"`).
- **Enums** are emitted bare (`{ "enum": [...] }`) with no `type`.
- **Outputs** are all `required`; an optional single carries its absence in a
  `null` type branch (`type: ["string", "null"]`), a list is `array` of path, and a
  captured stream (stdout/stderr) is an `array` of string **without** `x-styx-type`
  (so a consumer can tell a stream from a file).
