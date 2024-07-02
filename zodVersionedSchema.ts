import { Schema, z } from "zod";

interface IVersionedSchema<
  DirectInputT,
  VersionedInputT,
  OutputT,
  DirectSchemaType extends z.ZodType<OutputT, z.ZodTypeDef, DirectInputT>,
  VersionedSchemaType extends z.ZodType<OutputT, z.ZodTypeDef, VersionedInputT>
> {
  directSchema: DirectSchemaType;
  versionedSchema: VersionedSchemaType;
  addVersion<NextInputT, NextOutputT, NextSchemaType extends z.ZodType<NextOutputT, z.ZodTypeDef, NextInputT>>(
    newSchemaGenerator: (previousSchema: DirectSchemaType) => NextSchemaType,
    migration: (data: DirectSchemaType["_output"]) => NextSchemaType["_input"]
  ): IVersionedSchema<
    NextSchemaType["_input"],
    NextSchemaType["_input"] | VersionedSchemaType["_input"],
    NextSchemaType["_output"],
    NextSchemaType,
    z.ZodType<NextSchemaType["_output"], z.ZodTypeDef, NextSchemaType["_input"] | VersionedSchemaType["_input"]>
  >;
}

function newVersionedSchema<
  DirectInputT,
  VersionedInputT,
  OutputT,
  DirectSchemaType extends z.ZodType<OutputT, z.ZodTypeDef, DirectInputT>,
  VersionedSchemaType extends z.ZodType<OutputT, z.ZodTypeDef, VersionedInputT>
>(
  directSchema: DirectSchemaType,
  versionedSchema: VersionedSchemaType
): IVersionedSchema<DirectInputT, VersionedInputT, OutputT, DirectSchemaType, VersionedSchemaType> {
  return {
    directSchema,
    versionedSchema,
    addVersion<NextInputT, NextOutputT, NextSchemaType extends z.ZodType<NextOutputT, z.ZodTypeDef, NextInputT>>(
      newSchemaGenerator: (previousSchema: DirectSchemaType) => NextSchemaType,
      migration: (data: DirectSchemaType["_output"]) => NextSchemaType["_input"]
    ): IVersionedSchema<
      NextSchemaType["_input"],
      NextSchemaType["_input"] | VersionedSchemaType["_input"],
      NextSchemaType["_output"],
      NextSchemaType,
      z.ZodType<NextSchemaType["_output"], z.ZodTypeDef, NextSchemaType["_input"] | VersionedSchemaType["_input"]>
    > {
      const newSchema = newSchemaGenerator(directSchema);
      return newVersionedSchema<
        NextSchemaType["_input"],
        NextSchemaType["_input"] | VersionedSchemaType["_input"],
        NextSchemaType["_output"],
        NextSchemaType,
        z.ZodType<NextSchemaType["_output"], z.ZodTypeDef, NextSchemaType["_input"] | VersionedSchemaType["_input"]>
      >(
        newSchema,
        z.union([newSchema, versionedSchema]).transform<NextSchemaType["_output"]>((data) => {
          try {
            return newSchema.parse(data);
          } catch (error) {
            return newSchema.parse(migration(versionedSchema.parse(data)));
          }
        })
      );
    },
  };
}
export function createVersionedSchema<SchemaType extends z.ZodType>(
  schema: SchemaType
): IVersionedSchema<SchemaType["_input"], SchemaType["_input"], SchemaType["_output"], SchemaType, SchemaType> {
  return newVersionedSchema(schema, schema);
}
