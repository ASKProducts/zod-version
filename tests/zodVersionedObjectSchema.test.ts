import { z } from "zod";
import { createVersionedObjectSchema } from "../src/zodVersionedObjectSchema";

function createBasicPersonSchema() {
  return z.object({
    name: z.string(),
    age: z.number(),
  });
}

test("not adding any versions behaves as expected", () => {
  const versionedPersonSchema = createVersionedObjectSchema(1, createBasicPersonSchema());
  expect(versionedPersonSchema.versionedSchema.parse({ name: "Alice", age: 42, schemaVersion: 1 })).toEqual({
    name: "Alice",
    age: 42,
    schemaVersion: 1,
  });
  expect(() => versionedPersonSchema.versionedSchema.parse({ name: "Alice", age: "42", schemaVersion: 1 })).toThrow();
});

test("adding a version works as expected", () => {
  const employeeSchema = createVersionedObjectSchema(1, createBasicPersonSchema()).addVersion(
    2,
    (previousSchema) =>
      previousSchema.extend({
        employeeId: z.string(),
      }),
    (data) => ({ ...data, employeeId: "123" })
  );

  expect(employeeSchema.versionedSchema.parse({ name: "Alice", age: 42, employeeId: "xxx", schemaVersion: 2 })).toEqual(
    {
      name: "Alice",
      age: 42,
      employeeId: "xxx",
      schemaVersion: 2,
    }
  );
  expect(employeeSchema.directSchema.parse({ name: "Alice", age: 42, employeeId: "xxx", schemaVersion: 2 })).toEqual({
    name: "Alice",
    age: 42,
    employeeId: "xxx",
    schemaVersion: 2,
  });

  expect(employeeSchema.versionedSchema.parse({ name: "Alice", age: 42, schemaVersion: 1 })).toEqual({
    name: "Alice",
    age: 42,
    employeeId: "123",
    schemaVersion: 2,
  });
  expect(() => employeeSchema.directSchema.parse({ name: "Alice", age: "42" })).toThrow();

  // @ts-expect-error
  const employee: z.infer<typeof employeeSchema.versionedSchema> = {
    name: "Alice",
    age: 42,
    schemaVersion: 2,
  };

  const employee2: z.infer<typeof employeeSchema.directSchema> = {
    name: "Alice",
    age: 42,
    employeeId: "xxx",
    // @ts-expect-error
    schemaVersion: 1,
  };
});

test("long schema with many fields", () => {
  const schema = createVersionedObjectSchema(
    1,
    z.object({
      name: z.string(),
    })
  )
    .addVersion(
      2,
      (previousSchema) =>
        previousSchema.extend({
          age: z.number(),
        }),
      (data) => ({ ...data, age: 42 })
    )
    .addVersion(
      3,
      (previousSchema) =>
        previousSchema.extend({
          employeeId: z.string(),
        }),
      (data) => ({ ...data, employeeId: "123" })
    );

  expect(schema.versionedSchema.parse({ name: "Alice", schemaVersion: 1 })).toEqual({
    name: "Alice",
    age: 42,
    employeeId: "123",
    schemaVersion: 3,
  });
  expect(schema.versionedSchema.parse({ name: "Alice", age: 50, schemaVersion: 2 })).toEqual({
    name: "Alice",
    age: 50,
    employeeId: "123",
    schemaVersion: 3,
  });
  expect(schema.versionedSchema.parse({ name: "Alice", age: 50, employeeId: "xxx", schemaVersion: 3 })).toEqual({
    name: "Alice",
    age: 50,
    employeeId: "xxx",
    schemaVersion: 3,
  });
});

test("renaming a field works as expected", () => {
  const schema = createVersionedObjectSchema(
    1,
    z.object({
      name: z.string(),
    })
  ).addVersion(
    2,
    (previousSchema) =>
      previousSchema.omit({ name: true }).extend({
        fullName: z.string(),
      }),
    (data) => ({ ...data, fullName: data.name })
  );

  expect(schema.versionedSchema.parse({ name: "Alice", schemaVersion: 1 })).toEqual({
    fullName: "Alice",
    schemaVersion: 2,
  });
  expect(schema.versionedSchema.parse({ fullName: "Alice", schemaVersion: 2 })).toEqual({
    fullName: "Alice",
    schemaVersion: 2,
  });
});
