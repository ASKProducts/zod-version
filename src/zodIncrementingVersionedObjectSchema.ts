import { z } from "zod";

// Just some typescript nonsense to increment a number literal type
type _IncDigit = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
type Digit = _IncDigit[number];

type _Inc<T extends string> = T extends `${infer F}${Digit}`
  ? T extends `${F}${infer L extends Digit}`
    ? `${L extends 9 ? _Inc<F> : F}${_IncDigit[L]}`
    : never
  : 1;

type Increment<T extends number> = number extends T
  ? number
  : `${T}` extends `${string}${"." | "+" | "-" | "e"}${string}`
  ? number
  : _Inc<`${T}`> extends `${infer N extends number}`
  ? N
  : never;

type NextSchemaShape<NewSchemaShape, NextVersion> = Omit<NewSchemaShape, "schemaVersion"> & {
  schemaVersion: z.ZodLiteral<NextVersion>;
};
type NextSchemaType<NextSchemaShape extends z.ZodRawShape> = z.ZodObject<NextSchemaShape>;
interface IIncrementingVersionedObjectSchema<
  Version extends number,
  SchemaShape extends z.ZodRawShape & { schemaVersion: z.ZodLiteral<Version> },
  VersionedInputT,
  VersionedSchemaType extends z.ZodType<z.ZodObject<SchemaShape>["_output"], z.ZodTypeDef, VersionedInputT>
> {
  directSchema: z.ZodObject<SchemaShape>;
  versionedSchema: VersionedSchemaType;
  addVersion<NewSchemaShape extends z.ZodRawShape>(
    newSchemaGenerator: (previousSchema: z.ZodObject<SchemaShape>) => z.ZodObject<NewSchemaShape>,
    migration: (data: z.ZodObject<SchemaShape>["_output"]) => z.ZodObject<NewSchemaShape>["_input"]
  ): IIncrementingVersionedObjectSchema<
    Increment<Version>,
    NextSchemaShape<NewSchemaShape, Increment<Version>>,
    VersionedSchemaType["_input"] | NextSchemaType<NextSchemaShape<NewSchemaShape, Increment<Version>>>["_input"],
    z.ZodType<
      NextSchemaType<NextSchemaShape<NewSchemaShape, Increment<Version>>>["_output"],
      z.ZodTypeDef,
      VersionedSchemaType["_input"] | NextSchemaType<NextSchemaShape<NewSchemaShape, Increment<Version>>>["_input"]
    >
  >;
}

function newIncrementingVersionedObjectSchema<
  Version extends number,
  SchemaShape extends z.ZodRawShape & { schemaVersion: z.ZodLiteral<Version> },
  VersionedInputT,
  VersionedSchemaType extends z.ZodType<z.ZodObject<SchemaShape>["_output"], z.ZodTypeDef, VersionedInputT>
>(
  directSchema: z.ZodObject<SchemaShape>,
  versionedSchema: VersionedSchemaType,
  version: Version
): IIncrementingVersionedObjectSchema<Version, SchemaShape, VersionedInputT, VersionedSchemaType> {
  return {
    directSchema,
    versionedSchema,
    addVersion<NewSchemaShape extends z.ZodRawShape>(
      newSchemaGenerator: (previousSchema: z.ZodObject<SchemaShape>) => z.ZodObject<NewSchemaShape>,
      migration: (data: z.ZodObject<SchemaShape>["_output"]) => z.ZodObject<NewSchemaShape>["_input"]
    ): IIncrementingVersionedObjectSchema<
      Increment<Version>,
      NextSchemaShape<NewSchemaShape, Increment<Version>>,
      VersionedSchemaType["_input"] | NextSchemaType<NextSchemaShape<NewSchemaShape, Increment<Version>>>["_input"],
      z.ZodType<
        NextSchemaType<NextSchemaShape<NewSchemaShape, Increment<Version>>>["_output"],
        z.ZodTypeDef,
        VersionedSchemaType["_input"] | NextSchemaType<NextSchemaShape<NewSchemaShape, Increment<Version>>>["_input"]
      >
    > {
      const newSchema = newSchemaGenerator(directSchema);
      const newSchemaWithVersion = z.object({
        ...newSchema.shape,
        schemaVersion: z.literal((version + 1) as Increment<Version>),
      });

      type NextSchemaShape = Omit<NewSchemaShape, "schemaVersion"> & {
        schemaVersion: z.ZodLiteral<Increment<Version>>;
      };
      type NextSchemaType = z.ZodObject<NextSchemaShape>;
      return newIncrementingVersionedObjectSchema<
        Increment<Version>,
        NextSchemaShape,
        VersionedSchemaType["_input"] | NextSchemaType["_input"],
        z.ZodType<NextSchemaType["_output"], z.ZodTypeDef, VersionedSchemaType["_input"] | NextSchemaType["_input"]>
      >(
        newSchemaWithVersion,
        z.union([newSchemaWithVersion, versionedSchema]).transform<NextSchemaType["_output"]>((data) => {
          try {
            return newSchemaWithVersion.parse(data);
          } catch (error) {
            return newSchemaWithVersion.parse({
              ...migration(versionedSchema.parse(data)),
              schemaVersion: (version + 1) as Increment<Version>,
            });
          }
        }),
        (version + 1) as Increment<Version>
      );
    },
  };
}

export function createIncrementingVersionedObjectSchema<
  SchemaShape extends z.ZodRawShape,
  BaseVersion extends number = 0
>(
  schema: z.ZodObject<SchemaShape>,
  baseVersion: BaseVersion = 0 as BaseVersion
): IIncrementingVersionedObjectSchema<
  BaseVersion,
  SchemaShape & { schemaVersion: z.ZodLiteral<BaseVersion> },
  z.ZodObject<SchemaShape & { schemaVersion: z.ZodLiteral<BaseVersion> }>["_input"],
  z.ZodObject<SchemaShape & { schemaVersion: z.ZodLiteral<BaseVersion> }>
> {
  const versionedSchema = z.object({
    ...schema.shape,
    schemaVersion: z.literal(baseVersion),
  });
  return newIncrementingVersionedObjectSchema(versionedSchema, versionedSchema, baseVersion);
}
