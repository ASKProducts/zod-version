import { z } from "zod";

type NextSchemaShape<NewSchemaShape, NextVersion> = Omit<NewSchemaShape, "schemaVersion"> & {
  schemaVersion: z.ZodLiteral<NextVersion>;
};
type NextSchemaType<NextSchemaShape extends z.ZodRawShape> = z.ZodObject<NextSchemaShape>;

interface IVersionedObjectSchema<
  Version extends z.Primitive,
  SchemaShape extends z.ZodRawShape & { schemaVersion: z.ZodLiteral<Version> },
  VersionedInputT,
  VersionedSchemaType extends z.ZodType<z.ZodObject<SchemaShape>["_output"], z.ZodTypeDef, VersionedInputT>
> {
  directSchema: z.ZodObject<SchemaShape>;
  versionedSchema: VersionedSchemaType;
  addVersion<NextVersion extends z.Primitive, NewSchemaShape extends z.ZodRawShape>(
    nextVersion: NextVersion,
    newSchemaGenerator: (previousSchema: z.ZodObject<SchemaShape>) => z.ZodObject<NewSchemaShape>,
    migration: (data: z.ZodObject<SchemaShape>["_output"]) => z.ZodObject<NewSchemaShape>["_input"]
  ): IVersionedObjectSchema<
    NextVersion,
    NextSchemaShape<NewSchemaShape, NextVersion>,
    VersionedSchemaType["_input"] | NextSchemaType<NextSchemaShape<NewSchemaShape, NextVersion>>["_input"],
    z.ZodType<
      NextSchemaType<NextSchemaShape<NewSchemaShape, NextVersion>>["_output"],
      z.ZodTypeDef,
      VersionedSchemaType["_input"] | NextSchemaType<NextSchemaShape<NewSchemaShape, NextVersion>>["_input"]
    >
  >;
}

function newVersionedObjectSchema<
  Version extends z.Primitive,
  SchemaShape extends z.ZodRawShape & { schemaVersion: z.ZodLiteral<Version> },
  VersionedInputT,
  VersionedSchemaType extends z.ZodType<z.ZodObject<SchemaShape>["_output"], z.ZodTypeDef, VersionedInputT>
>(
  directSchema: z.ZodObject<SchemaShape>,
  versionedSchema: VersionedSchemaType
): IVersionedObjectSchema<Version, SchemaShape, VersionedInputT, VersionedSchemaType> {
  return {
    directSchema,
    versionedSchema,
    addVersion<NextVersion extends z.Primitive, NewSchemaShape extends z.ZodRawShape>(
      nextVersion: NextVersion,
      newSchemaGenerator: (previousSchema: z.ZodObject<SchemaShape>) => z.ZodObject<NewSchemaShape>,
      migration: (data: z.ZodObject<SchemaShape>["_output"]) => z.ZodObject<NewSchemaShape>["_input"]
    ): IVersionedObjectSchema<
      NextVersion,
      NextSchemaShape<NewSchemaShape, NextVersion>,
      VersionedSchemaType["_input"] | NextSchemaType<NextSchemaShape<NewSchemaShape, NextVersion>>["_input"],
      z.ZodType<
        NextSchemaType<NextSchemaShape<NewSchemaShape, NextVersion>>["_output"],
        z.ZodTypeDef,
        VersionedSchemaType["_input"] | NextSchemaType<NextSchemaShape<NewSchemaShape, NextVersion>>["_input"]
      >
    > {
      const newSchema = newSchemaGenerator(directSchema);
      const newSchemaWithVersion = z.object({
        ...newSchema.shape,
        schemaVersion: z.literal(nextVersion),
      });

      return newVersionedObjectSchema<
        NextVersion,
        NextSchemaShape<NewSchemaShape, NextVersion>,
        VersionedSchemaType["_input"] | NextSchemaType<NextSchemaShape<NewSchemaShape, NextVersion>>["_input"],
        z.ZodType<
          NextSchemaType<NextSchemaShape<NewSchemaShape, NextVersion>>["_output"],
          z.ZodTypeDef,
          VersionedSchemaType["_input"] | NextSchemaType<NextSchemaShape<NewSchemaShape, NextVersion>>["_input"]
        >
      >(
        newSchemaWithVersion,
        z
          .union([newSchemaWithVersion, versionedSchema])
          .transform<NextSchemaType<NextSchemaShape<NewSchemaShape, NextVersion>>["_output"]>((data) => {
            try {
              return newSchemaWithVersion.parse(data);
            } catch (error) {
              return newSchemaWithVersion.parse({
                ...migration(versionedSchema.parse(data)),
                schemaVersion: nextVersion,
              });
            }
          })
      );
    },
  };
}

export function createVersionedObjectSchema<SchemaShape extends z.ZodRawShape, Version extends z.Primitive>(
  baseVersion: Version,
  schema: z.ZodObject<SchemaShape>
): IVersionedObjectSchema<
  Version,
  SchemaShape & { schemaVersion: z.ZodLiteral<Version> },
  z.ZodObject<SchemaShape>["_input"],
  z.ZodObject<SchemaShape>
> {
  const versionedSchema = z.object({
    ...schema.shape,
    schemaVersion: z.literal(baseVersion),
  });
  return newVersionedObjectSchema(versionedSchema, versionedSchema);
}
